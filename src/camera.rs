use cgmath::*;

#[derive(Clone)]
pub struct OrbitalCamera {
    render_width: f32,
    render_height: f32,

    pub fov: f32,
    pub near: f32,
    pub far: f32,

    pub up: Vector3<f32>,
    pub center: Vector3<f32>,
    pub dir_from_center: Vector3<f32>,
    pub dist: f32,
}

impl OrbitalCamera {
    pub fn calculate_perspective_matrix(&self) -> Matrix4<f32> {
        perspective(
            Deg(self.fov),
            self.render_width / self.render_height,
            self.near, self.far
        ) 
    }

    pub fn calculate_view_matrix(&self) -> Matrix4<f32> {
        let eye_pos = self.calculate_pos();
        Matrix4::look_to_rh(Point3::from_vec(eye_pos), -self.dir_from_center, self.up)
    }

    pub fn set_size(&mut self, width: f32, height: f32) {
        self.render_width = width;
        self.render_height = height;
    }

    pub fn calculate_pos(&self) -> Vector3<f32> {
        self.center + self.dir_from_center * self.dist
    }
}

impl Default for OrbitalCamera {
    fn default() -> Self {
        Self {
            render_width: 0.0f32,
            render_height: 0.0f32,

            fov: 60.0f32,
            near: 1.0f32,
            far: 1_000.0f32,

            up: Vector3::new(0.0f32, 1.0, 0.0),
            center: Vector3::new(0.0f32, 0.0, 0.0),
            dir_from_center: Vector3::new(0.0f32, 0.0, 1.0),
            dist: 5.0f32,
        }
    }
}
