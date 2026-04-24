"use client";

import { useState, useEffect } from "react";
import { getAllStudents, updateStudentProfile, deleteStudentAccount } from "@/services/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Edit, Trash2, User, Mail, GraduationCap, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StudentRegistry() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState({ full_name: "", student_id: "", course_year: "" });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const data = await getAllStudents();
    setStudents(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this student account?")) return;
    try {
      await deleteStudentAccount(id);
      toast.success("Student deleted");
      fetchStudents();
    } catch (err) {
      toast.error("Failed to delete student");
    }
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setEditForm({
      full_name: student.full_name || "",
      student_id: student.student_id || "",
      course_year: student.course_year || ""
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateStudentProfile(editingStudent.id, editForm);
      toast.success("Profile updated");
      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading students...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="px-4 py-1">
          {students.length} Total Students
        </Badge>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Student Name</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Course & Year</TableHead>
                <TableHead>Face Data</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{student.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{student.student_id}</TableCell>
                    <TableCell>{student.course_year}</TableCell>
                    <TableCell>
                      {student.face_registered ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                          <Check className="h-3 w-3" /> Registered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Student Dialog Overlay */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <CardTitle>Edit Student Profile</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingStudent(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleUpdate}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input 
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student ID</label>
                  <Input 
                    value={editForm.student_id}
                    onChange={(e) => setEditForm({...editForm, student_id: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course & Year</label>
                  <Input 
                    value={editForm.course_year}
                    onChange={(e) => setEditForm({...editForm, course_year: e.target.value})}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-4 gap-2">
                <Button variant="outline" className="flex-1" type="button" onClick={() => setEditingStudent(null)}>Cancel</Button>
                <Button className="flex-1" type="submit">Save Changes</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
