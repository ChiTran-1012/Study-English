
"use client";

import { useState } from "react";
import TeacherSidebar from "../components/teacher-sidebar";

export default function TeacherLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <TeacherSidebar
                open={open}
                setOpen={setOpen}
            />

            {/* Main content */}
            <main
                className={`
                    min-h-screen
                    transition-all duration-300
                    ${open ? "ml-64" : "ml-20"}
                `}
            >
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
