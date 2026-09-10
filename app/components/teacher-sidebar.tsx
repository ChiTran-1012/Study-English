import Link from 'next/link';
import LogoutButton from './logout-button';

export default function TeacherSidebar(){
    return (
        <aside className='flex min-h-screen w-64 flex-col border-r bg-white p-5'>
            <div className='mb-8'>
                <h1 className='text-xl font-bold text-blue-600'>English AI</h1>

                <p className='text-sm text-gray-500'>Teacher Portal</p>
            </div>

            <nav className='flex flex-col gap-2'>
                <Link href="/teacher" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>Dashboard</Link>
                <Link href="/teacher/classes" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>Classes</Link>
                <Link href="/teacher/students" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>Students</Link>
                <Link href="/teacher/exercises" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>Exercises</Link>
                <Link href="/teacher/ai-generator" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>AI Generator</Link>
                <Link href="/teacher/analytics" className='rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-100'>Analytics</Link>
                <LogoutButton/>
            </nav>
        </aside>
    )
}