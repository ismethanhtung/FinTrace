export default function NewsLoading() {
    return (
        <div className="min-h-screen bg-[#f4f1ea] text-[#1a1a1a] px-4 py-6">
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="h-8 border-b border-black/30 animate-pulse" />
                <div className="h-28 border-b-4 border-black animate-pulse" />
                <div className="h-10 border-b border-black/30 animate-pulse" />
                <div className="h-8 border-b border-black/30 animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                    <div className="lg:col-span-3 space-y-4">
                        <div className="h-72 border border-black/50 bg-white/40 animate-pulse" />
                        <div className="h-40 border border-black/20 bg-white/20 animate-pulse" />
                        <div className="h-44 border border-black/20 bg-white/20 animate-pulse" />
                    </div>
                    <div className="lg:col-span-6 space-y-4">
                        <div className="h-72 border border-black/50 bg-white/40 animate-pulse" />
                        <div className="h-14 bg-black/5 animate-pulse" />
                        <div className="h-36 border-t-4 border-black/50 bg-white/20 animate-pulse" />
                    </div>
                    <div className="lg:col-span-3 space-y-4">
                        <div className="h-56 border border-black bg-black/90 animate-pulse" />
                        <div className="h-40 border border-black/20 bg-white/20 animate-pulse" />
                        <div className="h-32 border-t-4 border-black/50 bg-white/20 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
