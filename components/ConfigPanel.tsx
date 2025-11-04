import { Upload, Link as LinkIcon } from 'lucide-react';

interface ConfigPanelProps {
  config: {
    serverUrl: string;
    formId: string;
    apiToken: string;
  };
  setConfig: (config: any) => void;
  isConnected: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onConnect: () => void;
  isLoading: boolean;
}

export default function ConfigPanel({
  config,
  setConfig,
  isConnected,
  onFileUpload,
  onConnect,
  isLoading,
}: ConfigPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Village Targets
          </label>
          <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm">Upload CSV</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Server URL */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Server URL
          </label>
          <input
            type="text"
            value={config.serverUrl}
            onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="https://eu.kobotoolbox.org"
          />
        </div>

        {/* Form ID */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Form ID
          </label>
          <input
            type="text"
            value={config.formId}
            onChange={(e) => setConfig({ ...config, formId: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Form ID"
          />
        </div>

        {/* Connect Button */}
        <div className="flex items-end">
          <button
            onClick={onConnect}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isConnected
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-primary text-white hover:bg-primary/90'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <LinkIcon className="w-4 h-4" />
            {isConnected ? 'Connected' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
