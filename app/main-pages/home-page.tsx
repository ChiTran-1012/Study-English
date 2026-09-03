import Footer from "../components/footer";
import Header from "../components/header";

export default function HomePage() {
    return (
        <div>
            <Header />
            <div className="flex justify-between px-24 py-10">
                <div className="justify-center flex flex-col">
                    <p className="text-5xl font-extrabold">Upgrade your skills,<br /><span className="text-blue-300 block mt-4">elevate your life</span></p>
                    <p className="pt-8 text-2xl pb-10">Join our community of learners and start your journey today.</p>
                    <button className="w-fit border border-blue-300 text-xl rounded-full px-6 py-3 bg-blue-300 hover:bg-blue-400 transition">
                        Get Started
                    </button>                </div>
                <div>
                    <img src="https://img.magnific.com/free-vector/cute-woman-study-with-laptop-book-cartoon-vector-icon-illustration-people-technology-isolated_138676-13540.jpg?semt=ais_hybrid&w=740&q=80" alt=""
                        className="w-xl rounded-2xl" />
                </div>
            </div>
            <Footer/>
        </div>
    )
}