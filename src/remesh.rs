use crate::mesh::IndexedMesh;

// just split triangles
pub struct Remesher {}
impl Remesher {
    pub fn split_faces(mesh: &mut IndexedMesh, iteration: usize) {
        let mut new_indices = Vec::with_capacity(mesh.indices.len());
        for _ in 0..iteration {
            for face_idxs in mesh.indices.windows(3).step_by(3) {
                let v0 = mesh.positions[face_idxs[0] as usize];
                let v1 = mesh.positions[face_idxs[1] as usize];
                let v2 = mesh.positions[face_idxs[2] as usize];

                let centroid = (v0 + v1 + v2) / 3.0;
                let new_idx = mesh.positions.len() as u32;
                mesh.positions.push(centroid);

                new_indices.extend([face_idxs[0], face_idxs[1], new_idx]);
                new_indices.extend([face_idxs[1], face_idxs[2], new_idx]);
                new_indices.extend([face_idxs[2], face_idxs[0], new_idx]);
            }

            std::mem::swap(&mut mesh.indices, &mut new_indices);
        }

        mesh.recalculate_normals();
    }
}
