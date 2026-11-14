
import Link from "next/link";
import Image from "next/image";
import Footer from "../components/footer";
import Header from "../components/header";

const skills = [
    {
        icon: "🎧",
        title: "Listening",
        description: "Improve your listening skills through interactive audio exercises.",
        color: "bg-purple-100",
        textColor: "text-purple-600",
    },
    {
        icon: "🎤",
        title: "Speaking",
        description: "Practice speaking English and receive instant AI feedback.",
        color: "bg-blue-100",
        textColor: "text-blue-600",
    },
    {
        icon: "📖",
        title: "Reading",
        description: "Explore interesting stories and develop reading comprehension.",
        color: "bg-green-100",
        textColor: "text-green-600",
    },
    {
        icon: "✍️",
        title: "Writing",
        description: "Practice writing and improve your grammar with AI assistance.",
        color: "bg-orange-100",
        textColor: "text-orange-600",
    },
];

const features = [
    {
        icon: "🤖",
        title: "AI-Powered Learning",
        description:
            "Get personalized exercises and instant feedback powered by Artificial Intelligence.",
    },
    {
        icon: "🎯",
        title: "Personalized Learning",
        description:
            "Learn at your own pace with exercises tailored to your level and abilities.",
    },
    {
        icon: "📊",
        title: "Track Your Progress",
        description:
            "Monitor your learning journey and discover your strengths and weaknesses.",
    },
];

export default function HomePage() {
    return (
        <div className="overflow-hidden bg-white">
            <Header />

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:px-12 lg:py-28">
                    <div>
                        <span className="mb-6 inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-600">
                            ✨ Smart English Learning Platform
                        </span>

                        <h1 className="text-4xl font-extrabold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
                            Upgrade your skills,
                            <span className="mt-2 block text-blue-500">
                                elevate your life.
                            </span>
                        </h1>

                        <p className="mt-7 max-w-xl text-lg leading-8 text-gray-600">
                            Discover a smarter way to learn English.
                            Practice four essential skills with AI-powered
                            exercises and personalized feedback.
                        </p>

                        <div className="mt-9 flex flex-wrap gap-4">
                            <Link
                                href="/register"
                                className="rounded-full bg-blue-500 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-1 hover:bg-blue-600"
                            >
                                Get Started →
                            </Link>

                            <Link
                                href="/about"
                                className="rounded-full border border-gray-300 bg-white px-8 py-4 font-semibold text-gray-700 transition hover:border-blue-400 hover:text-blue-600"
                            >
                                Learn More
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center gap-4">
                            <div className="flex -space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-yellow-200">👦</div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-pink-200">👧</div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-green-200">👨</div>
                            </div>
                            <p className="text-sm text-gray-600">
                                <span className="font-bold text-gray-900">
                                    Learn every day
                                </span>
                                <br />
                                Make your English better!
                            </p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-5 top-10 h-40 w-40 rounded-full bg-blue-200 opacity-40 blur-3xl" />

                        <Image
                            src="https://img.magnific.com/free-vector/cute-woman-study-with-laptop-book-cartoon-vector-icon-illustration-people-technology-isolated_138676-13540.jpg?semt=ais_hybrid&w=740&q=80"
                            alt="Student learning English online"
                            className="relative mx-auto w-full max-w-xl rounded-3xl object-cover"
                            width={740}
                            height={740}
                        />

                        <div className="absolute -bottom-5 -left-3 rounded-2xl bg-white p-4 shadow-xl md:left-0">
                            <p className="text-sm text-gray-500">Your learning journey</p>
                            <p className="mt-1 font-bold text-blue-600">
                                Keep improving! 🚀
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Statistics */}
            <section className="border-y border-gray-100 bg-white">
                <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 text-center md:grid-cols-4">
                    {[
                        ["4", "Essential Skills"],
                        ["AI", "Smart Feedback"],
                        ["24/7", "Online Learning"],
                        ["∞", "Learning Opportunities"],
                    ].map(([number, label]) => (
                        <div key={label}>
                            <h2 className="text-3xl font-extrabold text-blue-500">
                                {number}
                            </h2>
                            <p className="mt-2 text-sm text-gray-500">{label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Skills Section */}
            <section className="mx-auto max-w-7xl px-6 py-24 md:px-12">
                <div className="mx-auto mb-14 max-w-2xl text-center">
                    <span className="font-semibold uppercase tracking-widest text-blue-500">
                        What You Will Learn
                    </span>
                    <h2 className="mt-4 text-3xl font-extrabold text-gray-900 md:text-4xl">
                        Master all four English skills
                    </h2>
                    <p className="mt-5 leading-7 text-gray-500">
                        Build your English foundation through engaging
                        lessons and interactive exercises.
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {skills.map((skill) => (
                        <div
                            key={skill.title}
                            className="group rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
                        >
                            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${skill.color}`}>
                                {skill.icon}
                            </div>

                            <h3 className="mt-6 text-xl font-bold text-gray-900">
                                {skill.title}
                            </h3>

                            <p className="mt-3 text-sm leading-7 text-gray-500">
                                {skill.description}
                            </p>

                            <Link
                                href="/register"
                                className={`mt-6 inline-block font-semibold ${skill.textColor}`}
                            >
                                Start Learning →
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-gray-50 px-6 py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="grid items-center gap-14 md:grid-cols-2">
                        <div>
                            <span className="font-semibold uppercase tracking-widest text-blue-500">
                                Why Choose Us
                            </span>

                            <h2 className="mt-4 text-3xl font-extrabold leading-tight text-gray-900 md:text-4xl">
                                Learning English has never been this smart.
                            </h2>

                            <p className="mt-5 leading-8 text-gray-500">
                                Our platform combines modern technology
                                and personalized learning to help students
                                improve their English skills effectively.
                            </p>

                            <div className="mt-9 space-y-7">
                                {features.map((feature) => (
                                    <div key={feature.title} className="flex gap-5">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                                            {feature.icon}
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-6 text-gray-500">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-white shadow-xl md:p-12">
                            <div className="text-5xl">🚀</div>
                            <h3 className="mt-8 text-3xl font-extrabold">
                                Your journey starts here!
                            </h3>
                            <p className="mt-5 leading-8 text-blue-100">
                                Practice every day, challenge yourself,
                                and watch your English improve step by step.
                            </p>

                            <div className="mt-10 space-y-4">
                                {[
                                    "Interactive English exercises",
                                    "AI-powered learning assistant",
                                    "Personalized progress tracking",
                                    "Learn anytime, anywhere",
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-3">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                                            ✓
                                        </span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="mx-auto max-w-7xl px-6 py-24">
                <div className="text-center">
                    <span className="font-semibold uppercase tracking-widest text-blue-500">
                        Simple Learning Process
                    </span>
                    <h2 className="mt-4 text-3xl font-extrabold text-gray-900 md:text-4xl">
                        Start learning in 3 easy steps
                    </h2>
                </div>

                <div className="mt-16 grid gap-10 md:grid-cols-3">
                    {[
                        {
                            step: "01",
                            icon: "👤",
                            title: "Create Your Account",
                            description: "Sign up and set up your personal learning profile.",
                        },
                        {
                            step: "02",
                            icon: "📚",
                            title: "Practice Every Day",
                            description: "Explore lessons and practice all four English skills.",
                        },
                        {
                            step: "03",
                            icon: "🏆",
                            title: "Track Your Progress",
                            description: "Review your results and improve with AI feedback.",
                        },
                    ].map((item) => (
                        <div key={item.step} className="relative rounded-3xl border border-gray-100 p-8 text-center transition hover:shadow-lg">
                            <span className="absolute right-7 top-5 text-4xl font-extrabold text-blue-50">
                                {item.step}
                            </span>

                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-4xl">
                                {item.icon}
                            </div>

                            <h3 className="mt-7 text-xl font-bold text-gray-900">
                                {item.title}
                            </h3>
                            <p className="mt-3 leading-7 text-gray-500">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="px-6 pb-24">
                <div className="mx-auto max-w-6xl rounded-3xl bg-blue-600 px-8 py-16 text-center text-white md:px-16">
                    <h2 className="text-3xl font-extrabold md:text-4xl">
                        Ready to improve your English?
                    </h2>

                    <p className="mx-auto mt-5 max-w-2xl leading-7 text-blue-100">
                        Join us today and take the first step toward
                        becoming a confident English speaker.
                    </p>

                    <Link
                        href="/register"
                        className="mt-9 inline-block rounded-full bg-white px-9 py-4 font-bold text-blue-600 shadow-lg transition hover:-translate-y-1 hover:bg-blue-50"
                    >
                        Join Us Now →
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}
