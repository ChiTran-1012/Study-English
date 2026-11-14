
"use client";

import { useState } from "react";
import StudentSidebar from "../components/student-sidebar";

export default function StudentLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50">
            <StudentSidebar
                open={open}
                setOpen={setOpen}
            />

            <main
                className={`
                    min-h-screen
                    transition-all
                    duration-300
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
