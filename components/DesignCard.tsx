import Link from "next/link";
import Image from "next/image";
import imgg from "@/public/ippy.png"
interface Props {
    cid: string;
    preview: string | null;
    title: string;
    owner: string;
}

export default function DesignCard({ cid, preview, title, owner }: Props) {
    const ownerMask = `${owner.slice(0, 6)}…${owner.slice(-4)}`;
    const initials = owner.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || ownerMask.slice(0, 2);

    return (
        <Link
            href={`/design/${cid}`}
            className="group block rounded-2xl border bg-white p-3 shadow-sm transition transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-300
                                 dark:bg-gray-900 dark:border-gray-800 dark:shadow-none dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
        >
            <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-3">
                
                    <Image
                        src={imgg}
                        alt={title}
                        width={100}
                        height={100}
                        className="w-fit h-fit object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
             

                {/* soft overlay for better contrast */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent dark:from-black/40" />
            </div>

            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                    </p>
                 
                </div>

                <div className="flex items-center gap-3">
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
                        style={{
                            background:
                                "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
                            boxShadow: "0 2px 8px rgba(99,102,241,0.18)",
                        }}
                        title={owner}
                    >
                        {initials}
                    </div>

                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                            {ownerMask}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">Owner</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
