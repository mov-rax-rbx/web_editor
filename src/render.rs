use cgmath::*;
use egui_glow::glow;

use crate::app::Settings;
use crate::camera::OrbitalCamera;
use crate::mesh::IndexedMesh;

enum RenderBuffersUsage {
    Static,
    Dynamic,
}

struct IndexedMeshRenderBuffers {
    vertices_cnt: u32,
    triangles_cnt: u32,

    positions_vbo: glow::Buffer,
    normals_vbo: glow::Buffer,
    indices_ebo: glow::Buffer,

    vao: glow::VertexArray,
}

impl IndexedMeshRenderBuffers {
    fn from_mesh(
        gl: &glow::Context,
        mesh: &IndexedMesh,
        usage: RenderBuffersUsage
    ) -> Result<IndexedMeshRenderBuffers, String> {
        use glow::HasContext as _;

        let usage_gl = match usage {
            RenderBuffersUsage::Static => glow::STATIC_DRAW,
            RenderBuffersUsage::Dynamic => glow::DYNAMIC_DRAW,
        };

        unsafe {
            let vao = gl.create_vertex_array()?;
            gl.bind_vertex_array(Some(vao));

            let positions_vbo = gl.create_buffer()?;

            gl.bind_buffer(glow::ARRAY_BUFFER, Some(positions_vbo));
            let positions_u8: &[u8] = core::slice::from_raw_parts(
                mesh.positions.as_ptr() as *const u8,
                mesh.positions.len() * 3 * core::mem::size_of::<f32>(),
            );
            gl.buffer_data_u8_slice(glow::ARRAY_BUFFER, positions_u8, usage_gl);
            gl.enable_vertex_attrib_array(0);
            gl.vertex_attrib_pointer_f32(0, 3, glow::FLOAT, false, 3 * core::mem::size_of::<f32>() as i32, 0);

            let normals_vbo = gl.create_buffer()?;

            gl.bind_buffer(glow::ARRAY_BUFFER, Some(normals_vbo));
            let normals_u8: &[u8] = core::slice::from_raw_parts(
                mesh.normals.as_ptr() as *const u8,
                mesh.normals.len() * 3 * core::mem::size_of::<f32>(),
            );
            gl.buffer_data_u8_slice(glow::ARRAY_BUFFER, normals_u8, usage_gl);
            gl.enable_vertex_attrib_array(1);
            gl.vertex_attrib_pointer_f32(1, 3, glow::FLOAT, false, 3 * core::mem::size_of::<f32>() as i32, 0);

            let indices_ebo = gl.create_buffer()?;
            gl.bind_buffer(glow::ELEMENT_ARRAY_BUFFER, Some(indices_ebo));
            let indices_u8: &[u8] = core::slice::from_raw_parts(
                mesh.indices.as_ptr() as *const u8,
                mesh.indices.len() * core::mem::size_of::<u32>(),
            );
            gl.buffer_data_u8_slice(glow::ELEMENT_ARRAY_BUFFER, indices_u8, usage_gl);

            gl.bind_vertex_array(None);

            Ok(IndexedMeshRenderBuffers {
                vertices_cnt: mesh.positions.len() as u32,
                triangles_cnt: (mesh.indices.len() / 3) as u32,

                positions_vbo,
                normals_vbo,
                indices_ebo,
                vao,
            })
        }
    }

    pub fn destroy(&self, gl: &glow::Context) {
        use glow::HasContext as _;
        unsafe {
            gl.delete_vertex_array(self.vao);
            gl.delete_buffer(self.positions_vbo);
            gl.delete_buffer(self.normals_vbo);
            gl.delete_buffer(self.indices_ebo);
        }
    }
}

pub struct RenderScene {
    program_default_indexed_mesh: glow::Program,
    indexed_render_buffers: Vec<IndexedMeshRenderBuffers>,
    indexed_render_buffers_temp: Vec<IndexedMeshRenderBuffers>,
}

// for glow
#[allow(unsafe_code)]
impl RenderScene {
    pub fn new(gl: &glow::Context) -> Self {
        use glow::HasContext as _;

        let shader_version = if cfg!(target_arch = "wasm32") {
            "#version 300 es"
        } else {
            "#version 410"
        };

        unsafe {
            let program = gl.create_program().expect("Cannot create program");

            let (vertex_shader_source, fragment_shader_source) = (
                r#"
                    layout (location = 0) in vec3 in_position;
                    layout (location = 1) in vec3 in_normal;

                    out vec3 vs_out_pos;
                    out vec3 vs_out_unproject_pos;
                    out vec3 vs_out_normal;

                    uniform mat4 u_model;
                    uniform mat4 u_view;
                    uniform mat4 u_proj;

                    void main() {
                        vs_out_pos = vec3(u_view * u_model * vec4(in_position.xyz, 1.0));
                        vs_out_normal = mat3(transpose(inverse(u_view * u_model))) * in_normal;
                        gl_Position = u_proj * u_view * u_model * vec4(in_position.xyz, 1.0);
                    }
                "#,
                r#"
                    precision mediump float;

                    in vec3 vs_out_pos;
                    in vec3 vs_out_normal;

                    out vec4 out_color;

                    uniform vec3 u_light_pos;
                    uniform vec3 u_camera_pos;
                    uniform vec4 u_color;

                    uniform int u_is_flat_shading;

                    void main() {
                        vec3 normal;
                        if (u_is_flat_shading == 0) {
                            normal = normalize(vs_out_normal);
                        } else {
                            normal = normalize(cross(dFdx(vs_out_pos), dFdy(vs_out_pos)));
                        }

                        vec3 light_dir = normalize(u_light_pos - vs_out_pos);
                        vec3 light_color = vec3(1.0, 1.0, 1.0);

                        vec3 view_dir = normalize(u_camera_pos - vs_out_pos);
                        vec3 reflect_dir = reflect(-light_dir, normal);

                        float ambient_strength = 0.1;
                        vec3 ambient = ambient_strength * light_color;
                        
                        float diff = max(dot(normal, light_dir), 0.0);
                        vec3 diffuse = diff * light_color;

                        float specular_strength = 0.5;
                        float spec = pow(max(dot(view_dir, reflect_dir), 0.0), 32.0);
                        vec3 specular = specular_strength * spec * light_color;

                        vec3 color = (ambient + diffuse + specular) * u_color.rgb;

                        out_color = vec4(color, u_color.a);
                    }
                "#,

            );

            let shader_sources = [
                (glow::VERTEX_SHADER, vertex_shader_source),
                (glow::FRAGMENT_SHADER, fragment_shader_source),
            ];

            let shaders: Vec<_> = shader_sources
                .iter()
                .map(|(shader_type, shader_source)| {
                    let shader = gl
                        .create_shader(*shader_type)
                        .expect("Cannot create shader");
                    gl.shader_source(shader, &format!("{}\n{}", shader_version, shader_source));
                    gl.compile_shader(shader);
                    if !gl.get_shader_compile_status(shader) {
                        panic!("{}", gl.get_shader_info_log(shader));
                    }
                    gl.attach_shader(program, shader);
                    shader
                })
                .collect();

            gl.link_program(program);
            if !gl.get_program_link_status(program) {
                panic!("{}", gl.get_program_info_log(program));
            }

            for shader in shaders {
                gl.detach_shader(program, shader);
                gl.delete_shader(shader);
            }

            Self {
                program_default_indexed_mesh: program,
                indexed_render_buffers: vec![],
                indexed_render_buffers_temp: vec![],
            }
        }
    }

    pub fn destroy(&self, gl: &glow::Context) {
        use glow::HasContext as _;
        unsafe {
            gl.delete_program(self.program_default_indexed_mesh);
            for buffer in self.indexed_render_buffers.iter() {
                buffer.destroy(gl);
            }
            for buffer in self.indexed_render_buffers_temp.iter() {
                buffer.destroy(gl);
            }
        }
    }

    pub fn reset_buffers(&mut self, gl: &glow::Context) {
        for buffer in self.indexed_render_buffers.iter() {
            buffer.destroy(gl);
        }
        self.indexed_render_buffers.clear();

        self.reset_temp_buffers(gl);
    } 

    pub fn push_static_mesh(&mut self, gl: &glow::Context, mesh: &IndexedMesh) {
        self.indexed_render_buffers
            .push(IndexedMeshRenderBuffers::from_mesh(gl, &mesh, RenderBuffersUsage::Static).unwrap());
    } 

    pub fn reset_static_and_create_static_meshes(&mut self, gl: &glow::Context, meshes: &[IndexedMesh]) {
        self.reset_buffers(gl);

        for mesh in meshes.iter() {
            self.push_static_mesh(gl, mesh);
        }
    }

    pub fn reset_temp_and_create_temp_meshes(&mut self, gl: &glow::Context, meshes: &[IndexedMesh]) {
        self.reset_temp_buffers(gl);

        for mesh in meshes.iter() {
            self.indexed_render_buffers_temp
                .push(IndexedMeshRenderBuffers::from_mesh(gl, &mesh, RenderBuffersUsage::Dynamic).unwrap());
        }
    }

    pub fn reset_temp_buffers(&mut self, gl: &glow::Context) {
        if self.indexed_render_buffers_temp.is_empty() { return; }

        for buffer in self.indexed_render_buffers_temp.iter() {
            buffer.destroy(gl);
        }
        self.indexed_render_buffers_temp.clear();
    }

    pub fn render(&self, gl: &glow::Context, settings: &Settings, camera: &OrbitalCamera) {
        use glow::HasContext as _;

        let proj = camera.calculate_perspective_matrix();
        let view = camera.calculate_view_matrix();
        let model = Matrix4::identity();

        unsafe {
            gl.use_program(Some(self.program_default_indexed_mesh));

            gl.uniform_matrix_4_f32_slice(
                gl.get_uniform_location(self.program_default_indexed_mesh, "u_model").as_ref(),
                false,
                std::slice::from_raw_parts(model.as_ptr(), 16)
            );
            gl.uniform_matrix_4_f32_slice(
                gl.get_uniform_location(self.program_default_indexed_mesh, "u_view").as_ref(),
                false,
                std::slice::from_raw_parts(view.as_ptr(), 16)
            );
            gl.uniform_matrix_4_f32_slice(
                gl.get_uniform_location(self.program_default_indexed_mesh, "u_proj").as_ref(),
                false,
                std::slice::from_raw_parts(proj.as_ptr(), 16)
            );
            gl.uniform_3_f32_slice(
                gl.get_uniform_location(self.program_default_indexed_mesh, "u_light_pos").as_ref(),
                &settings.light_pos
            );

            let camera_pos = camera.calculate_pos();
            gl.uniform_3_f32(
                gl.get_uniform_location(self.program_default_indexed_mesh, "u_camera_pos").as_ref(),
                camera_pos.x, camera_pos.y, camera_pos.z
            );

            let is_flat_shading_i32 = if settings.is_flat_shading { 1 } else { 0 };
            gl.uniform_1_i32(
                gl.get_uniform_location(self.program_default_indexed_mesh, "u_is_flat_shading").as_ref(),
                is_flat_shading_i32
            );

            gl.enable(glow::DEPTH_TEST);
            gl.clear(glow::DEPTH_BUFFER_BIT);

            if settings.is_cull_face {
                gl.enable(glow::CULL_FACE);
                gl.cull_face(glow::BACK);
            }

            if settings.is_render_static {
                const MESH_COLOR: [f32; 4] = [0.8, 0.8, 0.8, 1.0];

                for buffer in self.indexed_render_buffers.iter() {
                    gl.uniform_4_f32_slice(
                        gl.get_uniform_location(self.program_default_indexed_mesh, "u_color").as_ref(),
                        &MESH_COLOR
                    );

                    gl.bind_vertex_array(Some(buffer.vao));
                    gl.draw_elements(glow::TRIANGLES, buffer.triangles_cnt as i32 * 3, glow::UNSIGNED_INT, 0);
                }

                if !self.indexed_render_buffers.is_empty() {
                    gl.bind_vertex_array(None);
                }
            }

            if settings.is_render_temp {
                const MESH_COLOR: [f32; 4] = [0.4, 0.4, 0.4, 1.0];

                for buffer in self.indexed_render_buffers_temp.iter() {
                    gl.uniform_4_f32_slice(
                        gl.get_uniform_location(self.program_default_indexed_mesh, "u_color").as_ref(),
                        &MESH_COLOR
                    );

                    gl.bind_vertex_array(Some(buffer.vao));
                    gl.draw_elements(glow::TRIANGLES, buffer.triangles_cnt as i32 * 3, glow::UNSIGNED_INT, 0);
                }

                if !self.indexed_render_buffers_temp.is_empty() {
                    gl.bind_vertex_array(None);
                }
            }
        }
    }
}
