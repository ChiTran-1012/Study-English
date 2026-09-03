import Student from "../components/student-sidebar";

export default function TeacherLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Student/>
            <main className="flex-1">{children}</main>
        </div>
    )
    
}