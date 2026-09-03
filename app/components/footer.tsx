"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFacebook,
    faInstagram,
    faTwitter
} from "@fortawesome/free-brands-svg-icons";

export default function Footer() {
    return (
        <div className="flex justify-between items-start px-56 py-20 bg-blue-300">

            {/* About */}
            <div className="w-96">
                <p className="text-3xl font-bold">Study Web</p>

                <p className="mt-4 text-gray-700">
                    Learn English easily and improve your skills every day.
                    Join our community and start your learning journey today.
                </p>

                <ul className="flex gap-5 mt-6 text-3xl">
                    <li>
                        <FontAwesomeIcon icon={faFacebook} />
                    </li>

                    <li>
                        <FontAwesomeIcon icon={faInstagram} />
                    </li>

                    <li>
                        <FontAwesomeIcon icon={faTwitter} />
                    </li>
                </ul>
            </div>

            {/* Skills */}
            <div className="gap-y-3">
                <p className="text-xl font-bold mb-4">Skills</p>
                <p>Reading</p>
                <p>Listening</p>
                <p>Writing</p>
                <p>Speaking</p>
            </div>

            {/* Download */}
            <div>
                <p className="text-xl font-bold mb-4">Download Now</p>

                <img
                    src="https://play-lh.googleusercontent.com/B7kOAQJvh_3KeTRelpV-NDyiOElDx7Rl7atsszpAe4VQmIzeY0IKScOeiVwasoQKQK8ylnqCRh8LZF0Jpzwu"
                    className="w-44 rounded-2xl"
                    alt="Download app"
                />
            </div>

        </div>
    );
}