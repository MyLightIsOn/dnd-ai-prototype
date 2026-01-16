'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ProviderConfig from './provider-config';
import { getApiKey, setApiKey } from '@/lib/storage/api-keys';

type ProviderName = 'openai' | 'anthropic' | 'google' | 'ollama';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({
  open,
  onOpenChange,
}: SettingsModalProps) {
  const providers: ProviderName[] = ['openai', 'anthropic', 'google', 'ollama'];

  // Local state for API keys during editing
  const [apiKeys, setApiKeys] = useState<Record<ProviderName, string>>({
    openai: '',
    anthropic: '',
    google: '',
    ollama: '',
  });

  // Load API keys from storage when modal opens
  useEffect(() => {
    if (open) {
      const loadedKeys: Record<ProviderName, string> = {
        openai: getApiKey('openai'),
        anthropic: getApiKey('anthropic'),
        google: getApiKey('google'),
        ollama: getApiKey('ollama'),
      };
      setApiKeys(loadedKeys);
    }
  }, [open]);

  const handleApiKeyChange = (provider: ProviderName, key: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [provider]: key,
    }));
  };

  const handleSave = () => {
    // Save all API keys to localStorage
    providers.forEach((provider) => {
      const key = apiKeys[provider];
      if (key.trim()) {
        setApiKey(provider, key);
      }
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to stored values
    const loadedKeys: Record<ProviderName, string> = {
      openai: getApiKey('openai'),
      anthropic: getApiKey('anthropic'),
      google: getApiKey('google'),
      ollama: getApiKey('ollama'),
    };
    setApiKeys(loadedKeys);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              API Keys
            </h3>
            <div className="space-y-4">
              {providers.map((provider) => (
                <ProviderConfig
                  key={provider}
                  provider={provider}
                  apiKey={apiKeys[provider]}
                  onApiKeyChange={handleApiKeyChange}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
