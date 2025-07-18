import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, RefreshCw, Copy } from "lucide-react";
import { useState } from "react";

interface APIKey {
  id: string;
  key: string;
  name: string;
  created_at: string;
}

interface APIKeysSectionProps {
  apiKeys: APIKey[] | undefined;
  isLoading: boolean;
  newKeyName: string;
  setNewKeyName: (name: string) => void;
  onCreateKey: (name: string) => void;
  onCopyKey: (key: string) => void;
  isCreating: boolean;
}

export const APIKeysSection = ({
  apiKeys,
  isLoading,
  newKeyName,
  setNewKeyName,
  onCreateKey,
  onCopyKey,
  isCreating
}: APIKeysSectionProps) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="h-5 w-5 mr-2" />
          API Keys
        </CardTitle>
        <CardDescription>
          Manage your API keys for authentication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Key name (optional)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <Button 
              onClick={() => onCreateKey(newKeyName)}
              disabled={isCreating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isCreating ? 'animate-spin' : ''}`} />
              Generate Key
            </Button>
          </div>
          
          {isLoading ? (
            <div className="animate-pulse bg-muted h-10 rounded"></div>
          ) : (
            <div className="space-y-2">
              {apiKeys?.length ? (
                apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">{key.name || 'Unnamed Key'}</p>
                      <p className="font-mono text-sm text-muted-foreground">
                        {key.key ? `${key.key.substring(0, 12)}...${key.key.slice(-4)}` : 'Invalid key'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => key.key && onCopyKey(key.key)}
                      disabled={!key.key}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No API keys found. Generate your first key above.
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};