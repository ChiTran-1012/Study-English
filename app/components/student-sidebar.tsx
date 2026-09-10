import Link from 'next/link';
import LogoutButton from './logout-button';

export default function StudentSidebar(){
    return (
        <aside className='flex min-h-screen w-64 flex-col border-r bg-white p-5'>
            <div className='mb-8'>
                <h1 className='text-xl font-bold text-blue-600'>English AI</h1>

                <p className='text-sm text-gray-500'>Student Portal</p>
            </div>

            <nav className='flex flex-col gap-2'>
                <Link href="/student" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>Dashboard</Link>
                <Link href="/student/classes" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>My Classes</Link>
                <Link href="/student/assignments" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>Assignments</Link>
                <Link href="/student/practice" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>Practice</Link>
                <Link href="/student/progress" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>My progress</Link>
                <LogoutButton/>
            </nav>
        </aside>
    )
}