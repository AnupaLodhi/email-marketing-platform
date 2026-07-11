import { Zap, ExternalLink } from "lucide-react";

export default function SetupRequired() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Mobdigital</h1>
          <p className="text-indigo-300 text-sm mt-1">Email Marketing Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Connect Supabase</h2>
          <p className="text-sm text-gray-500 mb-6">
            Use the Supabase connect button in the Figma Make chat to link your project.
          </p>

          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-sm font-medium text-gray-800">Click the Supabase connect button</p>
                <p className="text-xs text-gray-500 mt-0.5">In the Figma Make chat panel, type a message asking to connect Supabase — a connect card will appear.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-sm font-medium text-gray-800">Select your Supabase project</p>
                <p className="text-xs text-gray-500 mt-0.5">Choose the project that has your subscribers, lists, and campaigns tables.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-sm font-medium text-gray-800">Reload the preview</p>
                <p className="text-xs text-gray-500 mt-0.5">After connecting, reload this preview. The login page will appear.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline"
            >
              Open Supabase Dashboard <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
