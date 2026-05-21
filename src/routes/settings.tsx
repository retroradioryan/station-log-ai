import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/Chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const [aiModel, setAiModel] = useState("google/gemini-3-flash-preview");
  const [stt, setStt] = useState("deepgram");
  const [quality, setQuality] = useState("128");
  const [chunk, setChunk] = useState("5");
  const [emailDigest, setEmailDigest] = useState(true);

  return (
    <>
      <PageHeader title="Settings" description="Configure providers, audio capture and export preferences." />
      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
        <Card>
          <CardHeader><CardTitle className="text-base">AI providers</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Summarization / classification</Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (default)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transcription provider</Label>
              <Select value={stt} onValueChange={setStt}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepgram">Deepgram Nova</SelectItem>
                  <SelectItem value="whisper">OpenAI Whisper</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recording</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Audio quality (kbps)</Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="64">64 kbps</SelectItem>
                  <SelectItem value="128">128 kbps</SelectItem>
                  <SelectItem value="192">192 kbps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chunk length (minutes)</Label>
              <Input type="number" value={chunk} onChange={(e) => setChunk(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Exports</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Daily email digest</Label>
                <p className="text-xs text-muted-foreground">Send a station-grouped log after each monitoring window.</p>
              </div>
              <Switch checked={emailDigest} onCheckedChange={setEmailDigest} />
            </div>
            <div>
              <Label>Digest recipients</Label>
              <Input placeholder="newsroom@example.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Save</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={() => toast.success("Settings saved")}>Save preferences</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
