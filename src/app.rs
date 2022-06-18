use std::sync::Arc;

use wasm_bindgen::JsCast;

use cgmath::*;
use egui::mutex::Mutex;
use egui_glow::glow;

use crate::camera::OrbitalCamera;
use crate::render::RenderScene;
use crate::mesh::IndexedMesh;
use crate::simplification::Simplify;
use crate::remesh::Remesher;

#[derive(Clone)]
pub struct Settings {
    pub is_cull_face: bool,
    pub is_flat_shading: bool,
    pub is_render_static: bool,
    pub is_render_temp: bool,

    pub light_pos: [f32; 3],
    pub scroll_sensitivity: f32,
    pub min_camera_dist: f32,

    pub simplification_error: f32,
    pub simplification_agr: f32,
    pub remesh_iterations: u32,

    pub total_num_faces: usize,
    pub total_num_faces_temp: usize,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            is_cull_face: true,
            is_flat_shading: true,
            is_render_static: true,
            is_render_temp: false,

            light_pos: [0.0, 5.0, 0.0],
            scroll_sensitivity: 0.001,
            min_camera_dist: 0.001,

            simplification_error: 1.0,
            simplification_agr: 7.0,
            remesh_iterations: 1,
            total_num_faces: 0,
            total_num_faces_temp: 0,
        }
    }
}

#[derive(PartialEq)]
enum PanelState {
    SelectionMenu,
    RemeshMenu,
    SimplificationMenu,
}

impl Default for PanelState {
    fn default() -> Self {
        PanelState::SelectionMenu
    }
}

pub struct WebEditor {
    render_scene_ref: Arc<Mutex<RenderScene>>,
    indexed_meshes: Vec<IndexedMesh>,
    indexed_meshes_temp: Vec<IndexedMesh>,

    settings: Settings,
    camera: OrbitalCamera,

    state: PanelState,

    receiver: Option<oneshot::Receiver<Vec<IndexedMesh>>>,
}

impl WebEditor {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        let mut app = Self {
            render_scene_ref: Arc::new(Mutex::new(RenderScene::new(
                cc.gl.as_ref()
            ))),
            indexed_meshes: vec![],
            indexed_meshes_temp: vec![],

            settings: Settings::default(),
            camera: OrbitalCamera::default(),

            state: PanelState::default(),

            receiver: None,
        };

        app.push_indexed_mesh(cc.gl.as_ref(), IndexedMesh::box3d(Vector3::new(1.0f32, 1.0, 1.0)));
        app
    }

    pub fn reset_all(&mut self, gl: &glow::Context) {
        self.render_scene_ref.lock().reset_buffers(gl);
        self.indexed_meshes.clear();
        self.settings.total_num_faces = 0;

        self.switch_to_selection_menu(gl);
    }
    pub fn switch_to_selection_menu(&mut self, gl: &glow::Context) {
        self.indexed_meshes_temp.clear();
        self.render_scene_ref.lock().reset_temp_buffers(gl);
        self.settings.total_num_faces_temp = 0;

        self.settings.is_render_static = true;
        self.settings.is_render_temp = false;

        self.state = PanelState::SelectionMenu;
    }
    pub fn apply_temp_mehes(&mut self, gl: &glow::Context) {
        self.indexed_meshes = self.indexed_meshes_temp.clone();
        self.render_scene_ref.lock().reset_static_and_create_static_meshes(gl, &self.indexed_meshes);
        self.settings.total_num_faces = self.settings.total_num_faces_temp;
        self.settings.total_num_faces_temp = 0;
    }
    pub fn clone_static_to_temp(&mut self, gl: &glow::Context) {
        self.indexed_meshes_temp = self.indexed_meshes.clone();
        self.render_scene_ref.lock().reset_temp_and_create_temp_meshes(gl, &self.indexed_meshes_temp);
        self.settings.total_num_faces_temp = self.settings.total_num_faces;
    }
    pub fn push_indexed_mesh(&mut self, gl: &glow::Context, mesh: IndexedMesh) {
        self.render_scene_ref.lock().push_static_mesh(gl, &mesh);
        self.indexed_meshes.push(mesh);
        self.settings.total_num_faces += self.indexed_meshes.last().unwrap().indices.len() / 3;
    }
    pub fn recalculate_camera_view(&mut self) {
        let mut center_point = Vector3::new(0.0f32, 0.0, 0.0);
        let (mut min, mut max) = (
            Vector3::new(std::f32::MAX, std::f32::MAX, std::f32::MAX),
            Vector3::new(std::f32::MIN, std::f32::MIN, std::f32::MIN)
        );

        for mesh in self.indexed_meshes.iter() {
            center_point += mesh.calculate_center_point() / self.indexed_meshes.len() as f32;

            let (min_local, max_local) = mesh.calculate_aabb();
            min.x = min.x.min(min_local.x);
            min.y = min.y.min(min_local.y);
            min.z = min.z.min(min_local.z);

            max.x = max.x.max(max_local.x);
            max.y = max.y.max(max_local.y);
            max.z = max.z.max(max_local.z);
        }

        self.camera.center = center_point;

        let scene_dist = max - min;
        let max_scene_dist_half = scene_dist.magnitude() / 2.0;
        let tan_half = (self.camera.fov / 180.0 * std::f32::consts::PI).tan() / 2.0;
        self.camera.dist = max_scene_dist_half / tan_half;

        self.settings.scroll_sensitivity = max_scene_dist_half * 0.001;
    }
}

impl eframe::App for WebEditor {
    fn update(&mut self, ctx: &egui::Context, frame: &mut eframe::Frame) {
        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            egui::menu::bar(ui, |ui| {
                egui::widgets::global_dark_light_mode_switch(ui);
                ui.menu_button("File", |ui| {
                    if ui.button("Open").clicked() {

                        let (sender, receiver) = oneshot::channel::<Vec<IndexedMesh>>();
                        self.receiver = Some(receiver);

                        let task = rfd::AsyncFileDialog::new().pick_files();
                        wasm_bindgen_futures::spawn_local(async {
                            let files = task.await;

                            let mut loaded_indexed_meshes = vec![];
                            if let Some(files) = files {
                                for file in files {
                                    let bytes = file.read();

                                    let file_name = file.file_name();
                                    let ext = std::path::Path::new(&file_name)
                                        .extension()
                                        .and_then(std::ffi::OsStr::to_str);

                                    let bytes = std::io::Cursor::new(bytes.await);

                                    if let Some(ext) = ext {
                                        let mesh = Files::read_indexed_mesh(bytes, ext);

                                        if let Ok(mesh) = mesh {
                                            if !mesh.is_empty() {
                                                loaded_indexed_meshes.push(mesh);
                                            }
                                        }
                                    }
                                }
                            }

                            let _err = sender.send(loaded_indexed_meshes);
                        });

                    }
                    ui.menu_button("Save", |ui| {
                        if ui.button("stl").clicked() {
                            let mut stl_mesh = vec![];
                            for mesh in self.indexed_meshes.iter() {
                                for face_idxs in mesh.indices.windows(3).step_by(3) {
                                    let v0 = mesh.positions[face_idxs[0] as usize];
                                    let v1 = mesh.positions[face_idxs[1] as usize];
                                    let v2 = mesh.positions[face_idxs[2] as usize];

                                    let face_normal = (v1 - v0).cross(v2 - v0);

                                    stl_mesh.push(
                                        stl_io::Triangle {
                                            normal: stl_io::Normal::new([face_normal.x, face_normal.y, face_normal.z]),
                                            vertices:
                                            [
                                                stl_io::Vertex::new([v0.x, v0.y, v0.z]),
                                                stl_io::Vertex::new([v1.x, v1.y, v1.z]),
                                                stl_io::Vertex::new([v2.x, v2.y, v2.z]),
                                            ]
                                        }
                                    );
                                }
                            }

                            let mut binary_stl = Vec::<u8>::new();
                            let write_result = stl_io::write_stl(&mut binary_stl, stl_mesh.iter());
                            if !write_result.is_ok() {
                                panic!("Error when create binary stl!");
                            }

                            let is_ok = Files::save_file_binary("file.stl", binary_stl);
                            if !is_ok {
                                panic!("Error when save stl file!");
                            }
                        }
                        if ui.button("ply").clicked() {
                            use ply_rs::ply::{
                                Ply, DefaultElement, Encoding,
                                ElementDef, PropertyDef, PropertyType,
                                ScalarType, Property, Addable
                            };
                            use ply_rs::writer::Writer;
                            let mut binary_ply = Vec::<u8>::new();

                            let mut ply = {
                                let mut ply = Ply::<DefaultElement>::new();
                                ply.header.encoding = Encoding::Ascii;
                                ply.header.comments.push("ply export from Web Editor".to_string());

                                let mut vertex_element = ElementDef::new("vertex".to_string());
                                let v = PropertyDef::new("x".to_string(), PropertyType::Scalar(ScalarType::Float));
                                vertex_element.properties.add(v);
                                let v = PropertyDef::new("y".to_string(), PropertyType::Scalar(ScalarType::Float));
                                vertex_element.properties.add(v);
                                let v = PropertyDef::new("z".to_string(), PropertyType::Scalar(ScalarType::Float));
                                vertex_element.properties.add(v);
                                ply.header.elements.add(vertex_element);

                                let mut face_element = ElementDef::new("face".to_string());
                                let face_type = PropertyType::List(ScalarType::UChar, ScalarType::Int);
                                let v = PropertyDef::new("vertex_indices".to_string(), face_type);
                                face_element.properties.add(v);
                                ply.header.elements.add(face_element);

                                let mut vertices = Vec::new();
                                for mesh in self.indexed_meshes.iter() {
                                    for v in mesh.positions.iter() {

                                        let mut vertex = DefaultElement::new();
                                        vertex.insert("x".to_string(), Property::Float(v.x));
                                        vertex.insert("y".to_string(), Property::Float(v.y));
                                        vertex.insert("z".to_string(), Property::Float(v.z));

                                        vertices.push(vertex);
                                    }
                                }
                                ply.payload.insert("vertex".to_string(), vertices);

                                let mut indices = Vec::new();
                                for mesh in self.indexed_meshes.iter() {
                                    for face_idxs in mesh.indices.windows(3).step_by(3) {

                                        let mut index = DefaultElement::new();
                                        index.insert(
                                            "vertex_indices".to_string(),
                                            Property::ListInt([face_idxs[0] as i32, face_idxs[1] as i32, face_idxs[2] as i32].into())
                                        );
                                        indices.push(index);
                                    }
                                }
                                ply.payload.insert("face".to_string(), indices);

                                ply.make_consistent().unwrap();
                                ply
                            };
                            let write_result = Writer::new().write_ply(&mut binary_ply, &mut ply);
                            if !write_result.is_ok() {
                                panic!("Error when create binary ply!");
                            }

                            let is_ok = Files::save_file_binary("file.ply", binary_ply);
                            if !is_ok {
                                panic!("Error when save ply file!");
                            }
                        }
                    });
                    if ui.button("Reset").clicked() {
                        self.reset_all(frame.gl());
                    }
                });
            });
        });

        Files::check_dropped_files_then_preview_load(ctx, frame.gl(), self);
        if let Some(receiver) = self.receiver.as_ref() {
            match receiver.try_recv() {
                Ok(loaded_indexed_meshes) => {
                    self.reset_all(frame.gl());
                    for indexed_mesh in loaded_indexed_meshes {
                        self.push_indexed_mesh(frame.gl(), indexed_mesh);
                    }

                    self.recalculate_camera_view();
                    self.receiver = None;
                }
                Err(oneshot::TryRecvError::Disconnected) => {
                    self.receiver = None;
                }
                _ => {}
            }
        }

        egui::SidePanel::left("side_panel").resizable(false).show(ctx, |ui| {
            ui.heading("Side Panel");
            ui.separator();

            match self.state {
                PanelState::SelectionMenu => {
                    ui.with_layout(egui::Layout::top_down(egui::Align::Center).with_cross_justify(true), |ui| {
                        if ui.button("Remesh").on_hover_text("Remesh operation").clicked() {
                            self.clone_static_to_temp(frame.gl());
                            self.settings.is_render_static = false;
                            self.settings.is_render_temp = true;
                            self.settings.remesh_iterations = 0;
                            self.state = PanelState::RemeshMenu;
                        }
                        if ui.button("Simplification").on_hover_text("Decimation operation").clicked() {
                            self.clone_static_to_temp(frame.gl());
                            self.settings.is_render_static = false;
                            self.settings.is_render_temp = true;
                            self.settings.simplification_error = 1.0;
                            self.state = PanelState::SimplificationMenu;
                        }

                        //let input = ui.input().clone();
                        //input.ui(ui);
                    });
                }
                PanelState::RemeshMenu => {
                    let mut iter = self.settings.remesh_iterations;
                    ui.add(egui::Slider::new(&mut iter, 1..=5).integer().text("Iterations"));

                    if self.settings.remesh_iterations != iter {

                        self.settings.total_num_faces_temp = 0;
                        for (mesh, new_mesh) in self.indexed_meshes.iter().zip(self.indexed_meshes_temp.iter_mut()) {
                            *new_mesh = mesh.clone();

                            Remesher::split_faces(new_mesh, iter as usize);
                            self.settings.total_num_faces_temp += new_mesh.indices.len() / 3;
                        }

                        self.settings.remesh_iterations = iter;
                        self.render_scene_ref.lock()
                            .reset_temp_and_create_temp_meshes(frame.gl(), &self.indexed_meshes_temp);
                    }

                    ui.label(&format!("faces before: {}", self.settings.total_num_faces));
                    ui.label(&format!("faces after: {}", self.settings.total_num_faces_temp));

                    ui.horizontal(|ui| {
                        if ui.button("Apply").on_hover_text("Apply changes and return to selection menu").clicked() {
                            self.apply_temp_mehes(frame.gl());
                            self.switch_to_selection_menu(frame.gl());
                        }
                        if ui.button("Back").on_hover_text("Reset changes and return to selection menu").clicked() {
                            self.switch_to_selection_menu(frame.gl());
                        }
                    });
                }
                PanelState::SimplificationMenu => {
                    let mut error = self.settings.simplification_error;
                    let mut agr = self.settings.simplification_agr;
                    ui.add(egui::Slider::new(&mut error, 0.001..=1.0).text("Error"));
                    ui.add(egui::Slider::new(&mut agr, 1.0..=20.0).text("Agresiveness"));

                    if (self.settings.simplification_error - error).abs() > std::f32::EPSILON
                        || (self.settings.simplification_agr - agr).abs() > std::f32::EPSILON {

                        self.settings.total_num_faces_temp = 0;
                        for (mesh, new_mesh) in self.indexed_meshes.iter().zip(self.indexed_meshes_temp.iter_mut()) {
                            *new_mesh = mesh.clone();

                            let mut simp = Simplify::from(new_mesh);
                            simp.simplify_mesh((error * (new_mesh.indices.len() / 3) as f32) as usize, agr);
                            simp.to(new_mesh);

                            self.settings.total_num_faces_temp += new_mesh.indices.len() / 3;
                        }

                        self.settings.simplification_error = error;
                        self.settings.simplification_agr = agr;
                        self.render_scene_ref.lock()
                            .reset_temp_and_create_temp_meshes(frame.gl(), &self.indexed_meshes_temp);
                    }

                    ui.label(&format!("faces before: {}", self.settings.total_num_faces));
                    ui.label(&format!("faces after: {}", self.settings.total_num_faces_temp));

                    ui.horizontal(|ui| {
                        if ui.button("Apply").on_hover_text("Apply changes and return to selection menu").clicked() {
                            self.apply_temp_mehes(frame.gl());
                            self.switch_to_selection_menu(frame.gl());
                        }
                        if ui.button("Back").on_hover_text("Reset changes and return to selection menu").clicked() {
                            self.switch_to_selection_menu(frame.gl());
                        }
                    });
                }
            }

            ui.with_layout(egui::Layout::bottom_up(egui::Align::Min).with_cross_justify(true), |ui| {
                ui.checkbox(&mut self.settings.is_cull_face, "set cull faces");
                ui.checkbox(&mut self.settings.is_flat_shading, "set flat shading");
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            ctx.request_repaint();

            self.camera.set_size(ui.max_rect().width(), ui.max_rect().height());
            self.camera.dist -= ui.input().scroll_delta.y * self.settings.scroll_sensitivity;
            self.camera.dist = self.camera.dist.max(self.settings.min_camera_dist);
            if ui.input().pointer.middle_down() {
                let delta_from_prev_frame = ui.input().pointer.delta();
                let right = self.camera.up.cross(self.camera.dir_from_center).normalize();
                self.camera.up = self.camera.dir_from_center.cross(right).normalize();

                let r_xz = Matrix3::from_axis_angle(self.camera.up, Deg(-delta_from_prev_frame.x));
                let r_yz = Matrix3::from_axis_angle(right, Deg(-delta_from_prev_frame.y));
                self.camera.dir_from_center = r_yz * r_xz * self.camera.dir_from_center;
            }

            let triangle = self.render_scene_ref.clone();
            let camera = self.camera.clone();
            let settings = self.settings.clone();

            let callback = egui::PaintCallback {
                rect: ui.max_rect(),
                callback: std::sync::Arc::new(move |_info, render_ctx| {
                    if let Some(painter) = render_ctx.downcast_ref::<egui_glow::Painter>() {
                        triangle.lock().render(painter.gl(), &settings, &camera);
                    } else {
                        eprintln!("Can't do custom painting because we are not using a glow context");
                    }
                }),
            };
            ui.painter().add(callback);
        });
    }

    fn on_exit(&mut self, gl: &glow::Context) {
        self.render_scene_ref.lock().destroy(gl);
    }
}

#[derive(Default)]
struct Files {}

impl Files {
    fn save_file_binary(filename: &str, content: Vec<u8>) -> bool {
        let window = web_sys::window();
        if window.is_none() {
            return false;
        }
        let window = window.unwrap();

        let document = window.document();
        if document.is_none() {
            return false;
        }
        let document = document.unwrap();

        let element = document.create_element("a");
        if element.is_err() {
            return false;
        }
        let element = element.unwrap();

        let a_element = element.dyn_into::<web_sys::HtmlAnchorElement>();
        if a_element.is_err() {
            return false;
        }
        let a_element = a_element.unwrap();

        let body = document.body();
        if body.is_none() {
            return false;
        }
        let body = body.unwrap();

        let append_child = body.append_child(&a_element);
        if append_child.is_err() {
            return false;
        }

        let uint8arr = js_sys::Uint8Array::new(&unsafe { js_sys::Uint8Array::view(&content) }.into());
        let blob_content = js_sys::Array::new();
        blob_content.push(&uint8arr.buffer());

        let blob = web_sys::Blob::new_with_u8_array_sequence_and_options(
            &blob_content,
            web_sys::BlobPropertyBag::new().type_("application/octet-stream")
        );
        if blob.is_err() {
            return false;
        }
        let blob = blob.unwrap();

        let url = web_sys::Url::create_object_url_with_blob(&blob);
        if url.is_err() {
            return false;
        }
        let url = url.unwrap();

        a_element.set_href(&url);
        a_element.set_download(filename);
        a_element.click();
        a_element.remove();

        true
    }

    fn check_dropped_files_then_preview_load(
        ctx: &egui::Context,
        gl: &glow::Context,
        web_editor: &mut WebEditor
    ) {
        if !ctx.input().raw.dropped_files.is_empty() {
            let dropped_files = ctx.input().raw.dropped_files.clone();

            web_editor.reset_all(gl);

            for dropped_file in dropped_files.iter() {
                if let Some(bytes_ref) = &dropped_file.bytes {
                    let file = std::io::Cursor::new(bytes_ref);

                    let ext = std::path::Path::new(&dropped_file.name)
                        .extension()
                        .and_then(std::ffi::OsStr::to_str);

                    if let Some(ext) = ext {
                        let mesh = Files::read_indexed_mesh(file, ext);

                        if let Ok(mesh) = mesh {
                            if !mesh.is_empty() {
                                web_editor.push_indexed_mesh(gl, mesh);
                            }
                        }
                    }
                }
            }

            web_editor.recalculate_camera_view();
        }
        Files::preview_files_being_dropped(ctx);
    }

    fn read_indexed_mesh<T>(mut file: std::io::Cursor<T>, ext: &str) -> Result<IndexedMesh, std::io::Error>
    where
        T: std::convert::AsRef<[u8]>,
    {
        match ext {
            "stl" | "STL" => {
                let mut stl = stl_io::create_stl_reader(&mut file)?;
                let stl_indexed_mesh = stl.as_indexed_triangles()?;

                let mut mesh = IndexedMesh {
                    positions: stl_indexed_mesh.vertices
                        .into_iter()
                        .map(|vertex| Vector3::new(vertex[0], vertex[1], vertex[2]))
                        .collect(),

                    normals: vec![],

                    indices: stl_indexed_mesh.faces
                        .into_iter()
                        .flat_map(|face|
                            [face.vertices[0] as u32, face.vertices[1] as u32, face.vertices[2] as u32]
                        )
                        .collect(),
                };
                mesh.recalculate_normals();
                Ok(mesh)
            }
            "ply" | "PLY" => {
                use ply_rs::*;

                struct Vertex {
                    v: [f32; 3],
                }
                struct Face {
                    vertices: Vec<i32>,
                }

                impl ply::PropertyAccess for Vertex {
                    fn new() -> Self {
                        Vertex { v: [0.0, 0.0, 0.0] }
                    }
                    fn set_property(&mut self, key: String, property: ply::Property) {
                        match (key.as_ref(), property) {
                            ("x", ply::Property::Float(v)) => self.v[0] = v,
                            ("y", ply::Property::Float(v)) => self.v[1] = v,
                            ("z", ply::Property::Float(v)) => self.v[2] = v,
                            (_, _) => {},
                        }
                    }
                }
                impl ply::PropertyAccess for Face {
                    fn new() -> Self {
                        Face { vertices: Vec::new() }
                    }
                    fn set_property(&mut self, key: String, property: ply::Property) {
                        match (key.as_ref(), property) {
                            ("vertex_index", ply::Property::ListInt(vec)) => self.vertices = vec,
                            ("vertex_indices", ply::Property::ListInt(vec)) => self.vertices = vec,
                            (_, _) => {},
                        }
                    }
                }
                let vertex_parser = parser::Parser::<Vertex>::new();
                let face_parser = parser::Parser::<Face>::new();

                let header = vertex_parser.read_header(&mut file)?;

                let mut mesh = IndexedMesh::default();
                for (_ignore_key, element) in &header.elements {
                    match element.name.as_ref() {
                        "vertex" => {
                            mesh.positions = vertex_parser
                                .read_payload_for_element(&mut file, &element, &header)
                                .unwrap()
                                .into_iter()
                                .map(|vertex| Vector3::new(vertex.v[0], vertex.v[1], vertex.v[2]))
                                .collect();
                            },
                        "face" => {
                            let ply_faces = face_parser
                                .read_payload_for_element(&mut file, &element, &header)
                                .unwrap();

                            for face in ply_faces {
                                for face_idx in (0..face.vertices.len()).into_iter().step_by(2) {
                                    mesh.indices.extend_from_slice(&[
                                        face.vertices[face_idx + 0] as u32,
                                        face.vertices[(face_idx + 1) % face.vertices.len()] as u32,
                                        face.vertices[(face_idx + 2) % face.vertices.len()] as u32
                                    ]);
                                }
                            }
                        },
                        _ => {},
                    }
                }

                mesh.recalculate_normals();
                Ok(mesh)
            }
            _ => {
                Err(std::io::Error::new(
                    std::io::ErrorKind::Other, format!("Not supported format `{}`", ext)
                ))
             }
        }
    }

    fn preview_files_being_dropped(ctx: &egui::Context) {
        use egui::*;
        if ctx.input().raw.hovered_files.is_empty() {
            return;
        }

        let mut text = "Dropping files:\n".to_string();
        for dropped_file in &ctx.input().raw.hovered_files {
            if let Some(path) = &dropped_file.path {
                text += &format!("\n{}", path.display());
            } else if !dropped_file.mime.is_empty() {
                text += &format!("\n{}", dropped_file.mime);
            } else {
                text += "\nUnknown file";
            }
        }

        let render =
            ctx.layer_painter(LayerId::new(Order::Foreground, Id::new("dropping_files")));

        let screen_rect = ctx.input().screen_rect();
        render.rect_filled(screen_rect, 0.0, Color32::from_black_alpha(180));
        render.text(
            screen_rect.center(),
            Align2::CENTER_CENTER,
            text,
            TextStyle::Heading.resolve(&ctx.style()),
            Color32::WHITE,
        );
    }
}
