"use client";

import { useEffect, useState } from "react";
import { StudentsManagerTab } from "@/components/dashboard/students-manager-tab";
import { PageShell } from "@/components/ui/page-shell";
import {
  listEnrollments,
  listHubs,
  listStudents,
  type EnrollmentRow,
  type Hub,
  type StudentRow,
} from "@/lib/api";

export default function AlunosPage() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[] | null>(null);
  const [hubs, setHubs] = useState<Hub[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [studentsData, enrollmentsData, hubsData] = await Promise.all([
        listStudents().catch(() => []),
        listEnrollments().catch(() => []),
        listHubs().catch(() => []),
      ]);
      setStudents(studentsData);
      setEnrollments(enrollmentsData);
      setHubs(hubsData);
    } catch {
      setStudents([]);
      setEnrollments([]);
      setHubs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <PageShell
      title="Alunos & Matrículas"
      subtitle="Alunos concluídos, credenciais da plataforma parceira EAD e acompanhamento de matrículas em curso."
    >
      <StudentsManagerTab
        students={students}
        enrollments={enrollments}
        hubs={hubs}
        loading={loading}
        onRefresh={loadData}
      />
    </PageShell>
  );
}

