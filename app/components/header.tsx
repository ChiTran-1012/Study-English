
import Link from "next/link";

const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Courses", href: "/courses" },
    { name: "Teacher", href: "/teacher" },
    { name: "Student", href: "/student" },
];

export default function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-xl font-bold text-white shadow-md shadow-blue-200">
                        E
                    </div>

                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                            English<span className="text-blue-500">AI</span>
                        </h1>
                        <p className="text-[10px] font-medium tracking-widest text-gray-400">
                            SMART LEARNING
                        </p>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="hidden items-center gap-8 lg:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-semibold text-gray-600 transition-colors duration-200 hover:text-blue-500"
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Login */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="rounded-full bg-blue-500 px-7 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-lg"
                    >
                        Login →
                    </Link>
                </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex justify-center gap-5 overflow-x-auto border-t border-gray-100 px-4 py-3 lg:hidden">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="shrink-0 text-xs font-semibold text-gray-600 transition hover:text-blue-500"
                    >
                        {link.name}
                    </Link>
                ))}
            </nav>
        </header>
    );
}
