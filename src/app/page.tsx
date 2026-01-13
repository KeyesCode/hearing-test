import Link from "next/link";
import DisclaimerBanner from "@/components/DisclaimerBanner";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6 text-center">
            Hearing Check
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 text-center">
            A non-medical hearing screening tool
          </p>

          <DisclaimerBanner />

          <div className="prose dark:prose-invert max-w-none mb-8">
            <h2 className="text-2xl font-semibold mb-4">About This Test</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This web-based hearing screening tool uses pure tones at different
              frequencies to help you assess your hearing sensitivity. It is
              designed to run entirely in your browser using the Web Audio API.
            </p>

            <h2 className="text-2xl font-semibold mb-4">Before You Start</h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>
                <strong>Use wired headphones if possible</strong> - This
                ensures accurate left/right ear testing
              </li>
              <li>
                <strong>Find a quiet room</strong> - Background noise can
                affect results
              </li>
              <li>
                <strong>Set your device volume</strong> - Adjust to a
                comfortable baseline level before starting
              </li>
              <li>
                <strong>Allow 5-10 minutes</strong> - The test involves
                multiple frequencies for each ear
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4">What to Expect</h2>
            <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-6">
              <li>Headphone check to verify left/right audio routing</li>
              <li>Environment confirmation</li>
              <li>Pure tone threshold test for your left ear</li>
              <li>Pure tone threshold test for your right ear</li>
              <li>Results displayed as an audiogram-style chart</li>
            </ol>

            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-8">
              <p className="text-red-800 dark:text-red-200">
                <strong>Medical Disclaimer:</strong> This tool is for screening
                purposes only and does not provide a medical diagnosis. Results
                are not calibrated to medical standards and may vary based on
                your device, headphones, and environment. If you have concerns
                about your hearing, experience hearing loss, or struggle to hear
                speech in noisy environments, please consult a licensed
                audiologist or healthcare provider for a professional evaluation.
              </p>
            </div>

          </div>

          <div className="text-center">
            <Link
              href="/test"
              className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Test
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

