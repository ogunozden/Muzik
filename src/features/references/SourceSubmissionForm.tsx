"use client";

import {useState} from "react";
import {Button} from "@/shared/ui/atoms/Button";
import {Input} from "@/shared/ui/atoms/Input";
import {Card, CardBody, CardHeader} from "@/shared/ui/atoms/Card";
import {runExternalReferenceAction} from "@/shared/api/external-references-client";

interface SourceSubmissionFormProps {
  catalogId?: string;
  title?: string;
  makam?: string;
  composer?: string;
}

export function SourceSubmissionForm({catalogId, title, makam, composer}: SourceSubmissionFormProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStatus("sending");
    try {
      await runExternalReferenceAction("stage", {
        url: url.trim(),
        title: desc.trim() || title || "",
        catalogId: catalogId || "",
        observedTitle: title || "",
        makam: makam || "",
        composer: composer || "",
      });
      setStatus("ok");
      setTimeout(() => { setOpen(false); setStatus("idle"); setUrl(""); setDesc(""); }, 2000);
    } catch {
      setStatus("err");
    }
  }

  return (
    <div className="mt-3">
      {!open && (
        <Button variant="outline" size="sm" onPress={() => setOpen(true)}>
          Kaynak Bildir
        </Button>
      )}
      {open && (
        <Card className="max-w-md border border-[var(--color-border-subtle)]">
          <CardHeader className="text-sm font-medium">Nota Kaynağı Bildir</CardHeader>
          <CardBody>
            <form onSubmit={submit} className="grid gap-2">
              <Input
                label="URL"
                value={url}
                onChange={(v) => setUrl(String(v))}
                placeholder="https://divanmakam.com/forum/..."
              />
              <Input
                label="Açıklama"
                value={desc}
                onChange={(v) => setDesc(String(v))}
                placeholder="Bu eserin notası burada..."
              />
              {catalogId && <p className="text-xs opacity-60 truncate">Eser: {title} | {makam} | {composer}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm" isDisabled={status === "sending"}>
                  {status === "sending" ? "Gönderiliyor..." : status === "ok" ? "Gönderildi" : "Gönder"}
                </Button>
                <Button type="button" variant="light" size="sm" onPress={() => setOpen(false)}>İptal</Button>
              </div>
              {status === "err" && <p className="text-xs text-red-500">Hata oluştu, tekrar dene.</p>}
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
