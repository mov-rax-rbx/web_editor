// Quadric Mesh Simplification

use std::ops::{Index, IndexMut, Add, AddAssign};

use cgmath::*;

use crate::mesh::IndexedMesh;

#[derive(Default, Clone, Copy)]
struct SymetricMatrix {
    m: [f32; 10],
}

impl SymetricMatrix {
    fn new(c: f32) -> Self {
        let mut m = Self::default();
        for e in &mut m.m {
            *e = c;
        }

        m
    }

    fn from_symetric(
        m11: f32, m12: f32, m13: f32, m14: f32,
        m22: f32, m23: f32, m24: f32,
        m33: f32, m34: f32,
        m44: f32
    ) -> Self {
        let mut m = Self::default();

        m.m[0] = m11;  m.m[1] = m12;  m.m[2] = m13;  m.m[3] = m14;
        m.m[4] = m22;  m.m[5] = m23;  m.m[6] = m24;
        m.m[7] = m33;  m.m[8] = m34;
        m.m[9] = m44;

        m
    }

    fn from_plane(a: f32, b: f32, c: f32, d: f32) -> Self {
        let mut m = Self::default();

        m.m[0] = a * a; m.m[1] = a * b; m.m[2] = a * c;  m.m[3] = a * d;
        m.m[4] = b * b; m.m[5] = b * c; m.m[6] = b * d;
        m.m[7] = c * c; m.m[8] = c * d;
        m.m[9] = d * d;

        m
    }

    fn det(
        &mut self,
        a11: usize, a12: usize, a13: usize,
        a21: usize, a22: usize, a23: usize,
        a31: usize, a32: usize, a33: usize
    ) -> f32 {
        self.m[a11] * self.m[a22] * self.m[a33] + self.m[a13] * self.m[a21] * self.m[a32] + self.m[a12] * self.m[a23] * self.m[a31]
            - self.m[a13] * self.m[a22] * self.m[a31] - self.m[a11] * self.m[a23] * self.m[a32]- self.m[a12] * self.m[a21] * self.m[a33]
    }
}

impl Index<usize> for SymetricMatrix {
    type Output = f32;
    fn index<'a>(&'a self, i: usize) -> &'a f32 {
        &self.m[i]
    }
}

impl IndexMut<usize> for SymetricMatrix {
    fn index_mut<'a>(&'a mut self, i: usize) -> &'a mut f32 {
        &mut self.m[i]
    }
}

impl Add<SymetricMatrix> for SymetricMatrix {
    type Output = SymetricMatrix;

    fn add(self, rhs: SymetricMatrix) -> SymetricMatrix {
        SymetricMatrix::from_symetric(
            self.m[0] + rhs.m[0], self.m[1] + rhs.m[1], self.m[2] + rhs.m[2], self.m[3] + rhs.m[3],
            self.m[4] + rhs.m[4], self.m[5] + rhs.m[5], self.m[6] + rhs.m[6],
            self.m[7] + rhs.m[7], self.m[8] + rhs.m[8],
            self.m[9] + rhs.m[9]
        )
    }
}

impl AddAssign<SymetricMatrix> for SymetricMatrix {

    fn add_assign(&mut self, rhs: SymetricMatrix) {
        self.m[0] += rhs.m[0]; self.m[1] += rhs.m[1]; self.m[2] += rhs.m[2]; self.m[3] += rhs.m[3];
        self.m[4] += rhs.m[4]; self.m[5] += rhs.m[5]; self.m[6] += rhs.m[6];
        self.m[7] += rhs.m[7]; self.m[8] += rhs.m[8];
        self.m[9] += rhs.m[9];
    }
}

#[derive(Clone)]
struct Triangle {
    v: [u32; 3],
    err: [f32; 4],
    deleted: i32,
    dirty: i32,
    n: Vector3<f32>,
}
#[derive(Clone)]
struct Vertex {
    p: Vector3<f32>,
    tstart: i32,
    tcount: i32,
    q: SymetricMatrix,
    border: i32,
}
#[derive(Clone)]
struct Ref {
    tid: i32,
    tvertex: i32,
}

pub struct Simplify {
    triangles: Vec<Triangle>,
    vertices: Vec<Vertex>,
    refs: Vec<Ref>,
}

impl Simplify {
    pub fn from(mesh: &IndexedMesh) -> Self {
        let mut simp = Simplify {
            triangles: vec![],
            vertices: vec![],
            refs: vec![],
        };

        for p in mesh.positions.iter() {
            let v = Vertex {
                p: *p,
                tstart: 0,
                tcount: 0,
                q: SymetricMatrix::new(0.0),
                border: 0
            };
            simp.vertices.push(v);
        }
        for face_idxs in mesh.indices.windows(3).step_by(3) {
            let t = Triangle {
                v: [face_idxs[0], face_idxs[1], face_idxs[2]],
                err: [0.0; 4],
                deleted: 0,
                dirty: 0,
                n: Vector3::new(0.0, 0.0, 0.0),
            };
            simp.triangles.push(t);
        }

        simp
    }

    pub fn to(&self, mesh: &mut IndexedMesh) {
        mesh.clear();

        for v in &self.vertices {
            mesh.positions.push(v.p);
        }

        for t in &self.triangles {
            if t.deleted != 0 { continue; }
            mesh.indices.extend(t.v);
        }
        mesh.recalculate_normals();
    }

    fn vertex_error(q: &SymetricMatrix, v: &Vector3<f32>) -> f32 {
        q[0] * v.x * v.x + 2.0 * q[1] * v.x * v.y + 2.0 * q[2] * v.x * v.z + 2.0 * q[3] * v.x + q[4] * v.y * v.y
            + 2.0 * q[5] * v.y * v.z + 2.0 * q[6] * v.y + q[7] * v.z * v.z + 2.0 * q[8] * v.z + q[9]
    }

    fn calculate_error(&self, id_v1: u32, id_v2: u32, p_result: &mut Vector3<f32>) -> f32 {

        let mut q = self.vertices[id_v1 as usize].q + self.vertices[id_v2 as usize].q;
        let border = self.vertices[id_v1 as usize].border & self.vertices[id_v2 as usize].border;
        let det = q.det(0, 1, 2, 1, 4, 5, 2, 5, 7);
        let error;

        if det != 0.0 && border == 0 {
            p_result.x = -1.0 / det * q.det(1, 2, 3, 4, 5, 6, 5, 7, 8);
            p_result.y =  1.0 / det * q.det(0, 2, 3, 1, 5, 6, 2, 7, 8);
            p_result.z = -1.0 / det * q.det(0, 1, 3, 1, 4, 6, 2, 5, 8);
            error = Simplify::vertex_error(&q, &p_result);
        }
        else {
            let p1 = self.vertices[id_v1 as usize].p;
            let p2 = self.vertices[id_v2 as usize].p;
            let p3 = (p1 + p2) / 2.0;

            let error1 = Simplify::vertex_error(&q, &p1);
            let error2 = Simplify::vertex_error(&q, &p2);
            let error3 = Simplify::vertex_error(&q, &p3);

            error = error1.min(error2.min(error3));
            if error1 == error { *p_result = p1; }
            if error2 == error { *p_result = p2; }
            if error3 == error { *p_result = p3; }
        }

        error
	}

    fn clean_mesh(&mut self) {
        let mut dst = 0usize;
        for v in &mut self.vertices {
            v.tcount = 0;
        }
        for i in 0..self.triangles.len() {
            if self.triangles[i].deleted == 0 {
                self.triangles[dst] = self.triangles[i].clone();
                dst += 1;

                let t = &self.triangles[i];
                for j in 0..3 {
                    self.vertices[t.v[j] as usize].tcount = 1;
                }
            }
        }
        self.triangles.resize(dst,
            Triangle {
                v: [0; 3],
                err: [0.0; 4],
                deleted: 0,
                dirty: 0,
                n: Vector3::new(0.0, 0.0, 0.0),
            }
        );

        dst = 0;
        for i in 0..self.vertices.len() {
            if self.vertices[i].tcount != 0 {
                self.vertices[i].tstart = dst as i32;
                self.vertices[dst].p = self.vertices[i].p;
                dst += 1;
            }
        }
        for t in &mut self.triangles {
            for j in 0..3 {
                t.v[j] = self.vertices[t.v[j] as usize].tstart as u32;
            }
        }
        self.vertices.resize(dst,
            Vertex {
                p: Vector3::new(0.0, 0.0, 0.0),
                tstart: 0,
                tcount: 0,
                q: SymetricMatrix::new(0.0),
                border: 0,
            }
        );
    }

    fn update_mesh(&mut self, iteration: usize) {
        if iteration > 0 {
            let mut dst = 0usize;

            for i in 0..self.triangles.len() {
                if self.triangles[i].deleted == 0 {
                    self.triangles[dst] = self.triangles[i].clone();
                    dst += 1;
                }

            }
            self.triangles.resize(dst,
                Triangle {
                    v: [0; 3],
                    err: [0.0; 4],
                    deleted: 0,
                    dirty: 0,
                    n: Vector3::new(0.0, 0.0, 0.0),
                }
            );
        }

        for v in &mut self.vertices {
            v.tstart = 0;
            v.tcount = 0;
        }
        for t in &mut self.triangles {
            for t_v in t.v {
                self.vertices[t_v as usize].tcount += 1;
            }
        }

        let mut tstart = 0;
        for v in &mut self.vertices {
            v.tstart = tstart;
            tstart += v.tcount;
            v.tcount = 0;
        }

        self.refs.resize(self.triangles.len() * 3, Ref { tid: 0, tvertex: 0 });
        for (i, t) in self.triangles.iter().enumerate() {
            for j in 0..3 {
                let v = &mut self.vertices[t.v[j] as usize];
                self.refs[(v.tstart + v.tcount) as usize].tid = i as i32;
                self.refs[(v.tstart + v.tcount) as usize].tvertex = j as i32;
                v.tcount += 1;
            }
        }

        if iteration == 0 {

            let mut vcount = vec![];
            let mut vids = vec![];

            for v in &mut self.vertices {
                v.border = 0;
            }

            for i in 0..self.vertices.len() {
                vcount.clear();
                vids.clear();
                for j in 0..self.vertices[i].tcount {

                    let k = self.refs[(self.vertices[i].tstart + j) as usize].tid;
                    let t = &self.triangles[k as usize];
                    for k in 0..3 {
                        let mut ofs = 0;
                        let id = t.v[k];
                        while ofs < vcount.len() {
                            if vids[ofs] == id { break; }
                            ofs += 1;
                        }
                        if ofs == vcount.len() {
                            vcount.push(1);
                            vids.push(id);
                        } else {
                            vcount[ofs] += 1;
                        }
                    }
                }
                for j in 0..vcount.len() {
                    if vcount[j] == 1 {
                        self.vertices[vids[j] as usize].border = 1;
                    }
                }
            }

            for v in &mut self.vertices {
                v.q = SymetricMatrix::new(0.0);
            }

            for t in &mut self.triangles {
                let n: Vector3<f32>;
                let mut p = [Vector3::new(0.0f32, 0.0, 0.0); 3];

                for j in 0..3 {
                    p[j] = self.vertices[t.v[j] as usize].p;
                }

                n = (p[1] - p[0]).cross(p[2] - p[0]).normalize();

                t.n = n;
                for j in 0..3 {
                    self.vertices[t.v[j] as usize].q =
                        self.vertices[t.v[j] as usize].q + SymetricMatrix::from_plane(n.x, n.y, n.z, -n.dot(p[0]));
                }
            }
            for i in 0..self.triangles.len() {
                let mut p = Vector3::new(0.0f32, 0.0, 0.0);
                for j in 0..3 {
                    self.triangles[j].err[j] =
                        self.calculate_error(self.triangles[i].v[j], self.triangles[i].v[(j + 1) % 3], &mut p);
                }
                self.triangles[i].err[3] = self.triangles[i].err[0]
                    .min(self.triangles[i].err[1].min(self.triangles[i].err[2]));
            }
        }
    }

    fn update_triangles(&mut self, i0: u32, v_idx: usize, deleted: &Vec<i32>, deleted_triangles: &mut usize) {
        let mut p = Vector3::new(0.0f32, 0.0, 0.0);
        for k in 0..self.vertices[v_idx].tcount {
            let r = &self.refs[(self.vertices[v_idx].tstart + k) as usize];

            if self.triangles[r.tid as usize].deleted != 0 { continue; }
            if deleted[k as usize] != 0 {
                self.triangles[r.tid as usize].deleted = 1;
                *deleted_triangles += 1;
                continue;
            }

            self.triangles[r.tid as usize].v[r.tvertex as usize] = i0;
            self.triangles[r.tid as usize].dirty = 1;

            self.triangles[r.tid as usize].err[0] =
                self.calculate_error(self.triangles[r.tid as usize].v[0], self.triangles[r.tid as usize].v[1], &mut p);
            self.triangles[r.tid as usize].err[1] =
                self.calculate_error(self.triangles[r.tid as usize].v[1], self.triangles[r.tid as usize].v[2], &mut p);
            self.triangles[r.tid as usize].err[2] =
                self.calculate_error(self.triangles[r.tid as usize].v[2], self.triangles[r.tid as usize].v[0], &mut p);

            self.triangles[r.tid as usize].err[3] = self.triangles[r.tid as usize].err[0]
                .min(self.triangles[r.tid as usize].err[1].min(self.triangles[r.tid as usize].err[2]));

            self.refs.push(self.refs[(self.vertices[v_idx].tstart + k) as usize].clone());
        }
    }

    fn flipped(&mut self, p: &Vector3<f32>, i1: u32, v_idx: usize, deleted: &mut Vec<i32>) -> bool {
        for k in 0..self.vertices[v_idx].tcount {
            let t = &self.triangles[self.refs[(self.vertices[v_idx].tstart + k) as usize].tid as usize];
            if t.deleted != 0 { continue; }

            let s = self.refs[(self.vertices[v_idx].tstart + k) as usize].tvertex;
            let id1 = t.v[((s + 1) % 3) as usize];
            let id2 = t.v[((s + 2) % 3) as usize];

            if id1 == i1 || id2 == i1 {
                deleted[k as usize] = 1;
                continue;
            }

            let d1 = (self.vertices[id1 as usize].p - p).normalize();
            let d2 = (self.vertices[id2 as usize].p - p).normalize();

            if d1.dot(d2).abs() > 0.999 {
                return true;
            }

            let n = d1.cross(d2).normalize();
            deleted[k as usize] = 0;
            if n.dot(t.n) < 0.2 {
                return true;
            }
        }

        false
    }

    pub fn simplify_mesh(&mut self, target_count: usize, agr: f32) {
        for t in &mut self.triangles {
            t.deleted = 0;
        }

        let mut deleted_triangles = 0;
        let mut deleted0 = vec![];
        let mut deleted1 = vec![];
        let triangle_count = self.triangles.len();

        for iteration in 0..100 {
            if triangle_count - deleted_triangles <= target_count { break; }

            if iteration % 5 == 0 {
                self.update_mesh(iteration);
            }

            for t in &mut self.triangles {
                t.dirty = 0;
            }

            // error between new and old mesh
            let threshold = 0.000000001 * ((iteration + 3) as f32).powf(agr);

            for i in 0..self.triangles.len() {
                if self.triangles[i].err[3] > threshold { continue; }
                if self.triangles[i].deleted != 0 { continue; }
                if self.triangles[i].dirty != 0 { continue; }

                for j in 0..3 {
                    if self.triangles[i].err[j] < threshold {
                        let i0 = self.triangles[i].v[j] as usize;
                        let i1 = self.triangles[i].v[(j + 1) % 3] as usize;

                        if self.vertices[i0].border != self.vertices[i1].border { continue; }

                        let mut p = Vector3::new(0.0f32, 0.0, 0.0);
                        self.calculate_error(i0 as u32, i1 as u32, &mut p);

                        deleted0.resize(self.vertices[i0].tcount as usize, 0);
                        deleted1.resize(self.vertices[i1].tcount as usize, 0);

                        if self.flipped(&p, i1 as u32, i0, &mut deleted0) { continue; }
                        if self.flipped(&p, i0 as u32, i1, &mut deleted1) { continue; }

                        self.vertices[i0].p = p;
                        self.vertices[i0].q = self.vertices[i1].q + self.vertices[i0].q;
                        let tstart = self.refs.len();

                        self.update_triangles(i0 as u32, i0, &deleted0, &mut deleted_triangles);
                        self.update_triangles(i0 as u32, i1, &deleted1, &mut deleted_triangles);

                        let tcount = self.refs.len() - tstart;

                        if tcount <= self.vertices[i0].tcount as usize {
                            for i in 0..tcount {
                                self.refs[self.vertices[i0].tstart as usize + i] = self.refs[tstart + i].clone();
                            }
                        }
                        else {
                            self.vertices[i0].tstart = tstart as i32;
                        }

                        self.vertices[i0].tcount = tcount as i32;
                        break;
                    }
                }

                if triangle_count - deleted_triangles <= target_count { break; }
            }
        }

        self.clean_mesh();
    }
}
