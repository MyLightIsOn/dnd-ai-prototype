'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getProvider } from '@/lib/providers';
import { getApiKey } from '@/lib/storage/api-keys';
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';

type ProviderName = 'openai' | 'anthropic' | 'google' | 'ollama';

interface ProviderConfigProps {
  provider: ProviderName;
  apiKey: string;
  onApiKeyChange: (provider: ProviderName, key: string) => void;
}

type ValidationStatus = 'not-configured' | 'valid' | 'invalid' | 'testing';

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  ollama: 'Ollama (Local)',
};

const PROVIDER_PLACEHOLDERS: Record<ProviderName, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AI...',
  ollama: 'http://localhost:11434',
};

export default function ProviderConfig({
  provider,
  apiKey,
  onApiKeyChange,
}: ProviderConfigProps) {
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>('not-configured');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [modelCount, setModelCount] = useState<number>(0);

  // Load initial validation status on mount
  useEffect(() => {
    const storedKey = getApiKey(provider);
    if (storedKey) {
      // Key exists but we haven't validated it yet
      setValidationStatus('not-configured');
    }
  }, [provider]);

  const handleTest = async () => {
    setValidationStatus('testing');
    setErrorMessage('');

    try {
      const providerInstance = getProvider(provider);
      if (!providerInstance) {
        setValidationStatus('invalid');
        setErrorMessage('Provider not found');
        return;
      }

      // For Ollama, we check connection without needing a key
      const keyToTest = provider === 'ollama' ? '' : apiKey;

      if (provider !== 'ollama' && !keyToTest.trim()) {
        setValidationStatus('invalid');
        setErrorMessage('API key is required');
        return;
      }

      const isValid = await providerInstance.validateApiKey(keyToTest);

      if (isValid) {
        setValidationStatus('valid');
        setErrorMessage('');

        // For Ollama, get model count
        if (provider === 'ollama') {
          setModelCount(providerInstance.models.length);
        }
      } else {
        setValidationStatus('invalid');
        setErrorMessage('Invalid API key or connection failed');
      }
    } catch (error) {
      setValidationStatus('invalid');
      setErrorMessage(
        error instanceof Error ? error.message : 'Validation failed'
      );
    }
  };

  const renderStatusIndicator = () => {
    switch (validationStatus) {
      case 'valid':
        return (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-4" />
            <span>
              Connected
              {provider === 'ollama' && modelCount > 0 && (
                <> - {modelCount} model{modelCount !== 1 ? 's' : ''} available</>
              )}
            </span>
          </div>
        );
      case 'invalid':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <XCircle className="size-4" />
              <span>Invalid</span>
            </div>
            {errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            )}
          </div>
        );
      case 'testing':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Testing...</span>
          </div>
        );
      case 'not-configured':
      default:
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4" />
            <span>Not configured</span>
          </div>
        );
    }
  };

  const isOllama = provider === 'ollama';

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="font-medium">{PROVIDER_LABELS[provider]}</div>

      <div className="flex gap-2">
        {isOllama ? (
          <Input
            type="text"
            value="http://localhost:11434"
            disabled
            readOnly
            className="flex-1"
          />
        ) : (
          <Input
            type="password"
            placeholder={PROVIDER_PLACEHOLDERS[provider]}
            value={apiKey}
            onChange={(e) => onApiKeyChange(provider, e.target.value)}
            className="flex-1"
          />
        )}

        <Button
          onClick={handleTest}
          disabled={validationStatus === 'testing' || (!isOllama && !apiKey.trim())}
          variant="outline"
          size="default"
        >
          {validationStatus === 'testing' ? 'Testing...' : 'Test'}
        </Button>
      </div>

      {renderStatusIndicator()}
    </div>
  );
}
