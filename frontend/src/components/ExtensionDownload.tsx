import { Download, Chrome, Puzzle, Settings, ToggleRight, CheckCircle2, FolderOpen } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function ExtensionDownload() {
    const { t } = useLanguage();

    const steps = [
        { icon: Download, key: 'ext.step1' },
        { icon: FolderOpen, key: 'ext.step2' },
        { icon: Chrome, key: 'ext.step3' },
        { icon: Puzzle, key: 'ext.step4' },
        { icon: Settings, key: 'ext.step5' },
        { icon: ToggleRight, key: 'ext.step6' },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-sekure-50 dark:bg-sekure-900/20 mb-4">
                    <Puzzle className="w-10 h-10 text-sekure-500" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('ext.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {t('ext.subtitle')}
                </p>
            </div>

            {/* Download button */}
            <div className="flex justify-center mb-12">
                <a
                    href="/sekure-extension.zip"
                    download
                    className="inline-flex items-center gap-3 px-10 py-5 bg-sekure-500 hover:bg-sekure-600 text-white text-xl font-bold rounded-2xl shadow-lg shadow-sekure-500/25 hover:shadow-xl hover:shadow-sekure-500/30 transition-all duration-200 hover:-translate-y-0.5"
                >
                    <Download className="w-7 h-7" />
                    {t('ext.download_btn')}
                </a>
            </div>

            {/* Instructions */}
            <div className="card p-6 md:p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-sekure-500" />
                    {t('ext.instructions_title')}
                </h2>

                <ol className="space-y-6">
                    {steps.map(({ icon: Icon, key }, i) => (
                        <li key={i} className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-sekure-50 dark:bg-sekure-900/20 flex items-center justify-center">
                                <span className="text-sekure-600 dark:text-sekure-400 font-bold text-sm">{i + 1}</span>
                            </div>
                            <div className="flex-1 pt-2">
                                <div className="flex items-start gap-2">
                                    <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {t(key)}
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>

                {/* Success note */}
                <div className="mt-8 p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-green-700 dark:text-green-400 text-sm leading-relaxed">
                            {t('ext.success_note')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
