import Link from "next/link";


export default function Header() {
    return (
        <div className="flex justify-between pt-10 px-40">
            <div>Logo</div>
            <ul className="flex space-x-16">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/about">About</Link></li>
                <li><Link href="/courses">Courses</Link></li>
                <li><Link href="/teacher">Teacher Dashboard</Link></li>
                <li><Link href="/student">Student Dashboard</Link></li>
            </ul>
            <Link href='/login'>
                <button className="w-fit border border-blue-300 rounded-full px-6 py-3 bg-blue-300 hover:bg-blue-400 transition">
                    Login
                </button>
            </Link>
        </div>
    )
}