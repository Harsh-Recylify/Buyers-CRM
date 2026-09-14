import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCreateNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Mail, Copy, Check, ExternalLink, Send, Sparkles } from "lucide-react";

export type CommunicationContext = {
  companyId?: number;
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  stage?: string;
  expectedRevenue?: number | null;
  expectedScrapWeight?: number | null;
  initialTemplate?: string;
  initialMessage?: string;
};

export function SmartCommunicationModal({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context: CommunicationContext;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createNote = useCreateNote();

  const [templateType, setTemplateType] = useState(context.initialTemplate || "inspection");
  const [recipientPhone, setRecipientPhone] = useState(context.phone || "");
  const [recipientEmail, setRecipientEmail] = useState(context.email || "");
  const [recipientName, setRecipientName] = useState(context.contactName || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate templates based on context
  useEffect(() => {
    if (!open) return;

    const coName = context.companyName || "your company";
    const person = recipientName ? ` ${recipientName}` : "";
    const revText = context.expectedRevenue ? ` (Est. Value: ₹${context.expectedRevenue.toLocaleString("en-IN")})` : "";
    const weightText = context.expectedScrapWeight ? ` ~${context.expectedScrapWeight.toLocaleString("en-IN")} kg` : "";

    if (context.initialMessage) {
      setMessage(context.initialMessage);
      setSubject(`IT Asset Disposal Project Update — ${coName}`);
      return;
    }

    switch (templateType) {
      case "inspection":
        setSubject(`Recyclify: Scheduling On-Site IT Asset Inspection — ${coName}`);
        setMessage(
          `Hi${person}! Greetings from Recyclify.\n\nFollowing up on the IT asset disposal & e-waste recycling requirement for *${coName}*${weightText}.\n\nWe would like to schedule a quick on-site physical inspection and count verification for your obsolete IT equipment (laptops, servers, desktops, networking).\n\nPlease let us know if our team can visit tomorrow or later this week. We will arrange data security NDAs beforehand.`
        );
        break;

      case "quotation":
        setSubject(`Recyclify: Commercial ITAD Proposal & Scrap Valuation — ${coName}`);
        setMessage(
          `Dear${person},\n\nWe have prepared the commercial valuation and recycling quotation for *${coName}*${revText}.\n\nOur proposal covers:\n1. Best market valuation across scrap & working lots\n2. 100% CPCB compliant recycling with Green Certificates\n3. Certified data sanitization & degaussing\n\nCould we schedule a brief 5-minute call today to review the proposal numbers?`
        );
        break;

      case "bid_invitation":
        setSubject(`Recyclify: New Verified ITAD Auction Lot Available — ${coName}`);
        setMessage(
          `Recyclify Bidder Alert 🚀\n\nA new IT asset disposal lot from *${coName}* is now open for bidding.\n\n• Lot Scope: IT Assets & E-Waste${weightText}\n• Location: ${coName}\n• Terms: Immediate pickup, certified recycler preference\n\nPlease log in to your Recyclify Buyer Portal to submit your competitive quotes before the deadline!`
        );
        break;

      case "stale_nudge":
        setSubject(`Follow-up regarding IT Asset Disposal — ${coName}`);
        setMessage(
          `Hi${person}, checking in from Recyclify regarding your IT asset disposal project for *${coName}*.\n\nWe noticed the project has been on hold in the "${context.stage || "Active"}" stage. Are you ready to proceed with the next steps, or do you require any revised rates or compliance documentation?\n\nHappy to assist at your convenience!`
        );
        break;

      case "logistics":
        setSubject(`Recyclify: Pickup Vehicle & Gate Pass Confirmation — ${coName}`);
        setMessage(
          `Dear${person},\n\nThis is to confirm the scheduled material pickup for *${coName}*.\n\n• Target Pickup Date: Upcoming Business Day\n• Required: Gate Pass for logistics vehicle & loading team\n• Documentation: CPCB Form 6 Manifest & Weighment Protocol attached\n\nPlease confirm the site security contact person for vehicle entry.`
        );
        break;

      default:
        setMessage(`Hi${person}, following up from Recyclify regarding the IT asset disposal project for ${coName}.`);
        setSubject(`Recyclify Project Update — ${coName}`);
    }
  }, [open, templateType, context, recipientName]);

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Copied to clipboard!", description: "Ready to paste into WhatsApp, Email, or Slack." });
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenWhatsApp() {
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(url, "_blank");

    if (context.companyId) {
      logActivityRecord("WhatsApp message drafted & opened");
    }
  }

  function handleOpenEmail() {
    const emailTo = recipientEmail || "";
    const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailtoUrl, "_blank");

    if (context.companyId) {
      logActivityRecord("Email draft opened");
    }
  }

  function logActivityRecord(actionLabel: string) {
    if (!context.companyId) return;

    createNote.mutate(
      {
        data: {
          entityType: "company",
          entityId: context.companyId,
          content: `[Smart Communication - ${actionLabel}]\nTemplate: ${templateType}\nMessage:\n${message}`,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListNotesQueryKey({ entityType: "company", entityId: context.companyId }),
          });
          toast({ title: "Activity logged to company timeline" });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#118847]">
            <Sparkles className="h-5 w-5" />
            <DialogTitle className="text-xl">Proactive 1-Click Outreach</DialogTitle>
          </div>
          <DialogDescription>
            Smart AI-crafted communication templates tailored for {context.companyName || "your client"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Template Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Template Type</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspection">🔍 Asset Inspection Request</SelectItem>
                  <SelectItem value="quotation">📊 Pricing Proposal & Valuation</SelectItem>
                  <SelectItem value="stale_nudge">⚡ Stagnant Deal Nudge</SelectItem>
                  <SelectItem value="bid_invitation">📢 Buyer Bid Broadcast</SelectItem>
                  <SelectItem value="logistics">🚚 Logistics & Gate Pass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Contact Person</Label>
              <Input
                placeholder="e.g. Rahul Sharma"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp Phone
              </Label>
              <Input
                placeholder="+91 98765 43210"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                Email Address
              </Label>
              <Input
                type="email"
                placeholder="contact@company.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Subject (for email) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Email Subject Line</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Message Content</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy text"}
              </Button>
            </div>
            <Textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="font-mono text-xs leading-relaxed bg-slate-50/50"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
            Copy All
          </Button>

          <Button
            type="button"
            variant="outline"
            className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={handleOpenEmail}
          >
            <Mail className="h-4 w-4" />
            Send Email
          </Button>

          <Button
            type="button"
            className="gap-1.5 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-medium"
            onClick={handleOpenWhatsApp}
          >
            <MessageSquare className="h-4 w-4" />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
