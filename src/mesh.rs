use cgmath::*;

#[derive(Default, Clone)]
pub struct IndexedMesh {
    pub positions: Vec<Vector3<f32>>,
    pub normals: Vec<Vector3<f32>>,
    pub indices: Vec<u32>,
}

impl IndexedMesh {
    pub fn is_empty(&self) -> bool {
        self.positions.is_empty() || self.normals.is_empty() || self.indices.is_empty()
    }
    pub fn clear(&mut self) {
        self.positions.clear();
        self.normals.clear();
        self.indices.clear();
    }

    pub fn recalculate_normals(&mut self) {
        self.normals.resize(self.positions.len(), Vector3::new(0.0, 0.0, 0.0));

        for face_idxs in self.indices.windows(3).step_by(3) {
            let v0 = self.positions[face_idxs[0] as usize];
            let v1 = self.positions[face_idxs[1] as usize];
            let v2 = self.positions[face_idxs[2] as usize];

            let face_normal = (v1 - v0).cross(v2 - v0);
            self.normals[face_idxs[0] as usize] += face_normal;
            self.normals[face_idxs[1] as usize] += face_normal;
            self.normals[face_idxs[2] as usize] += face_normal;
        }
        for normal in self.normals.iter_mut() {
            *normal = normal.normalize();
        }
    }

    pub fn calculate_center_point(&self) -> Vector3<f32> {
        let mut center_point = Vector3::new(0.0f32, 0.0, 0.0);
        for v in self.positions.iter() {
            center_point += *v / self.positions.len() as f32;
        }

        center_point
    }

    pub fn calculate_aabb(&self) -> (Vector3<f32>, Vector3<f32>) {
        let (mut min, mut max) = (
            Vector3::new(std::f32::MAX, std::f32::MAX, std::f32::MAX),
            Vector3::new(std::f32::MIN, std::f32::MIN, std::f32::MIN)
        );
        for v in self.positions.iter() {
            min.x = min.x.min(v.x);
            min.y = min.y.min(v.y);
            min.z = min.z.min(v.z);

            max.x = max.x.max(v.x);
            max.y = max.y.max(v.y);
            max.z = max.z.max(v.z);
        }

        (min, max)
    }

    pub fn box3d(len: Vector3<f32>) -> IndexedMesh {

        let mut box3d = IndexedMesh::default();
        let half_len = len / 2.0;
        let center = Vector3::new(0.0f32, 0.0, 0.0);

        box3d.positions.push(center + Vector3::new(-half_len.x, -half_len.y, -half_len.z));
        box3d.positions.push(center + Vector3::new(half_len.x, -half_len.y, -half_len.z));
        box3d.positions.push(center + Vector3::new(-half_len.x, half_len.y, -half_len.z));
        box3d.positions.push(center + Vector3::new(half_len.x, half_len.y, -half_len.z));

        box3d.positions.push(center + Vector3::new(-half_len.x, -half_len.y, half_len.z));
        box3d.positions.push(center + Vector3::new(half_len.x, -half_len.y, half_len.z));
        box3d.positions.push(center + Vector3::new(-half_len.x, half_len.y, half_len.z));
        box3d.positions.push(center + Vector3::new(half_len.x, half_len.y, half_len.z));

        box3d.indices.extend_from_slice(&[1, 0, 2]);
        box3d.indices.extend_from_slice(&[2, 3, 1]);

        box3d.indices.extend_from_slice(&[5, 1, 7]);
        box3d.indices.extend_from_slice(&[3, 7, 1]);

        box3d.indices.extend_from_slice(&[4, 5, 6]);
        box3d.indices.extend_from_slice(&[7, 6, 5]);

        box3d.indices.extend_from_slice(&[0, 4, 2]);
        box3d.indices.extend_from_slice(&[6, 2, 4]);

        box3d.indices.extend_from_slice(&[3, 2, 7]);
        box3d.indices.extend_from_slice(&[6, 7, 2]);

        box3d.indices.extend_from_slice(&[1, 4, 0]);
        box3d.indices.extend_from_slice(&[4, 1, 5]);

        box3d.recalculate_normals();

        box3d
    }
}
