
"use client";

import Link from "next/link";

import LogoutButton from "./logout-button";

const menuItems = [
    {
        href: "/teacher",
        label: "Dashboard",
        icon: "📊",
    },
    {
        href: "/teacher/classes",
        label: "Classes",
        icon: "🏫",
    },
    {
        href: "/teacher/students",
        label: "Students",
        icon: "👨‍🎓",
    },
    {
        href: "/teacher/exercises",
        label: "Exercises",
        icon: "📝",
    },
    {
        href: "/teacher/ai-generator",
        label: "AI Generator",
        icon: "🤖",
    },
    {
        href: "/teacher/assignments",
        label: "Assignments",
        icon: "📚",
    },
    {
        href: "/teacher/statistics",
        label: "Thống kê",
        icon: "📈",
    },
];

type TeacherSidebarProps = {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function TeacherSidebar({
    open,
    setOpen,
}: TeacherSidebarProps) {
    return (
        <aside
            className={`
                fixed
                left-0
                top-0
                z-50
                flex
                h-screen
                flex-col
                border-r
                border-gray-200
                bg-white
                shadow-lg
                transition-all
                duration-300
                ${open ? "w-64" : "w-20"}
            `}
        >
            {/* Header */}
            <div
                className={`
                    flex
                    h-20
                    items-center
                    border-b
                    border-gray-100
                    px-4
                    ${open ? "justify-between" : "justify-center"}
                `}
            >
                {/* Logo */}
                {open && (
                    <div className="flex items-center gap-3">
                        <div
                            className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                bg-gradient-to-br
                                from-blue-600
                                to-indigo-600
                                text-xl
                                text-white
                                shadow-md
                            "
                        >
                            👨‍🏫
                        </div>

                        <div>
                            <h1 className="font-bold text-gray-800">
                                Teacher
                            </h1>

                            <p className="text-xs text-gray-400">
                                Study English
                            </p>
                        </div>
                    </div>
                )}

                {/* Hamburger */}
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-lg
                        text-gray-600
                        transition
                        hover:bg-gray-100
                        hover:text-blue-600
                    "
                    aria-label="Toggle sidebar"
                >
                    <div className="space-y-1.5">
                        <span className="block h-0.5 w-5 bg-current" />
                        <span className="block h-0.5 w-5 bg-current" />
                        <span className="block h-0.5 w-5 bg-current" />
                    </div>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 p-3">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        title={!open ? item.label : undefined}
                        className="
                            group
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            py-3
                            text-gray-600
                            transition-all
                            duration-200
                            hover:bg-blue-50
                            hover:text-blue-600
                        "
                    >
                        {/* Icon */}
                        <span
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-gray-50
                                text-lg
                                transition
                                group-hover:bg-blue-100
                            "
                        >
                            {item.icon}
                        </span>

                        {/* Text */}
                        {open && (
                            <span className="font-medium">
                                {item.label}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>

            {/* Logout */}
            <div className="border-t border-gray-100 p-3">
                <div
                    className={`
                        flex
                        items-center
                        rounded-xl
                        bg-red-50
                        p-2
                        text-red-600
                        ${open ? "gap-3" : "justify-center"}
                    `}
                >
                    <span
                        className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-white
                            text-lg
                        "
                    >
                        🚪
                    </span>

                    {open && <LogoutButton />}
                </div>
            </div>
        </aside>
    );
}
