import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MessageCircle, Plus, Hash, Users, Mic, MicOff, Send,
  Play, Pause, ChevronRight, ChevronLeft, Info, Bot, User,
  Loader2, Radio,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatRoom {
  id: number;
  name: string;
  type: string;
  description: string | null;
  createdBy: number;
  isPublic: number;
  participantIds: string | null;
  createdAt: string;
}

interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  senderName: string;
  senderType: string; // 'human' | 'ai'
  messageType: string; // 'text' | 'voice' | 'system'
  content: string;
  voiceDuration: string | null;
  createdAt: string;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Voice Waveform ──────────────────────────────────────────────────────────

function WaveformBars({ isPlaying, count = 24 }: { isPlaying: boolean; count?: number }) {
  // Deterministic bar heights so they don't re-render randomly
  const heights = [40, 65, 30, 80, 55, 70, 45, 90, 60, 75, 35, 85, 50, 65, 40, 75, 55, 80, 45, 70, 60, 85, 40, 65];
  return (
    <div className="flex items-center gap-0.5 h-8" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-0.5 rounded-full transition-all",
            isPlaying ? "bg-teal-400 animate-pulse" : "bg-muted-foreground/40"
          )}
          style={{
            height: `${heights[i % heights.length]}%`,
            animationDelay: isPlaying ? `${(i * 40) % 400}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

// ─── Voice Player ─────────────────────────────────────────────────────────────

function VoicePlayer({ content, duration }: { content: string; duration: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const totalDuration = duration ? parseFloat(duration) : 0;

  useEffect(() => {
    const audio = new Audio(content);
    audioRef.current = audio;
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [content]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-lg px-3 py-2 min-w-[200px]">
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-full flex items-center justify-center bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 transition-colors flex-shrink-0"
        data-testid="button-voice-play"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <WaveformBars isPlaying={isPlaying} count={24} />
      <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
        {isPlaying ? formatTime(currentTime) : formatTime(totalDuration)}
      </span>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function SenderAvatar({ name, type }: { name: string; type: string }) {
  const isAI = type === "ai";
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
        isAI
          ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
      )}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.messageType === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  const isAI = msg.senderType === "ai";

  return (
    <div className="flex gap-3 group" data-testid={`message-${msg.id}`}>
      <SenderAvatar name={msg.senderName} type={msg.senderType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{msg.senderName}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-medium",
              isAI
                ? "border-teal-500/40 text-teal-400 bg-teal-500/10"
                : "border-purple-500/40 text-purple-400 bg-purple-500/10"
            )}
          >
            {isAI ? <><Bot className="w-2.5 h-2.5 mr-0.5 inline" />AI</> : <><User className="w-2.5 h-2.5 mr-0.5 inline" />Human</>}
          </Badge>
          <span className="text-xs text-muted-foreground/60 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {formatRelativeTime(msg.createdAt)}
          </span>
        </div>
        {msg.messageType === "voice" ? (
          <VoicePlayer content={msg.content} duration={msg.voiceDuration} />
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        )}
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-xs text-muted-foreground/60">
        {names.join(", ")} {names.length === 1 ? "is" : "are"} typing
      </span>
    </div>
  );
}

// ─── Voice Recording ──────────────────────────────────────────────────────────

interface VoicePreview {
  blob: Blob;
  dataUrl: string;
  duration: number;
}

function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<VoicePreview | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      setElapsed(0);

      mr.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const dur = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          setPreview({ blob, dataUrl: reader.result as string, duration: dur });
        };
        reader.readAsDataURL(blob);
      };

      mr.start(100);
      setRecording(true);

      // Auto-stop at 60s
      timerRef.current = setInterval(() => {
        const e = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(e);
        if (e >= 60) stop();
      }, 200);
    } catch {
      // mic permission denied or unavailable
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  const cancel = useCallback(() => {
    stop();
    setPreview(null);
  }, [stop]);

  return { recording, preview, elapsed, start, stop, cancel, clearPreview: () => setPreview(null) };
}

// ─── New Room Dialog ──────────────────────────────────────────────────────────

function NewRoomDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (room: ChatRoom) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/chat/rooms", { name, description, type: "group", isPublic: true });
    },
    onSuccess: async (res) => {
      const room = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      onCreated(room);
      setName("");
      setDescription("");
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Room Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Project Alpha"
              data-testid="input-room-name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (optional)</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this room for?"
              data-testid="input-room-description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
            data-testid="button-create-room"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Left Panel — Room List ───────────────────────────────────────────────────

function RoomList({
  rooms,
  activeRoomId,
  onSelectRoom,
  onNewRoom,
}: {
  rooms: ChatRoom[];
  activeRoomId: number | null;
  onSelectRoom: (room: ChatRoom) => void;
  onNewRoom: () => void;
}) {
  const groups = rooms.filter(r => r.type === "group");
  const dms = rooms.filter(r => r.type === "dm");

  return (
    <div className="flex flex-col h-full border-r border-border bg-sidebar">
      {/* Header */}
      <div className="px-3 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Chat</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onNewRoom}
          className="h-7 w-7 p-0"
          data-testid="button-new-room"
          title="New Room"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-3 space-y-4">
          {/* Group Rooms */}
          <div>
            <div className="flex items-center gap-1.5 px-2 mb-1">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Group Rooms
              </span>
            </div>
            {groups.map(room => (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md transition-all text-sm",
                  activeRoomId === room.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                data-testid={`room-${room.id}`}
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                  <span className="font-medium truncate">{room.name}</span>
                  {activeRoomId === room.id && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                </div>
                {room.description && activeRoomId !== room.id && (
                  <p className="text-xs text-muted-foreground truncate ml-5 mt-0.5">{room.description}</p>
                )}
              </button>
            ))}
          </div>

          {/* DMs */}
          {dms.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Direct Messages
                </span>
              </div>
              {dms.map(room => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded-md transition-all text-sm",
                    activeRoomId === room.id
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                  data-testid={`room-dm-${room.id}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-purple-500/20 border border-purple-500/30 flex-shrink-0" />
                    <span className="font-medium truncate">{room.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Right Panel — Room Info ──────────────────────────────────────────────────

function RoomInfoPanel({ room }: { room: ChatRoom }) {
  return (
    <div className="flex flex-col h-full border-l border-border bg-sidebar/50 p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Hash className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{room.name}</h3>
        </div>
        {room.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{room.description}</p>
        )}
      </div>

      <div className="h-px bg-border mb-4" />

      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Room Details</div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Type</span>
          <Badge variant="outline" className="text-[10px] capitalize">{room.type}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Visibility</span>
          <Badge variant="outline" className="text-[10px]">{room.isPublic ? "Public" : "Private"}</Badge>
        </div>
      </div>

      <div className="h-px bg-border my-4" />

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Participants</div>
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30">
          <div className="w-6 h-6 rounded bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <Bot className="w-3 h-3 text-teal-400" />
          </div>
          <div>
            <div className="text-xs font-medium">AI Agents</div>
            <div className="text-[10px] text-teal-400">via REST API</div>
          </div>
        </div>
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md mt-1.5 bg-muted/30">
          <div className="w-6 h-6 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <User className="w-3 h-3 text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-medium">Humans</div>
            <div className="text-[10px] text-purple-400">via Web UI</div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <div className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Created {formatRelativeTime(room.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ─── Message Input ────────────────────────────────────────────────────────────

interface MessageInputProps {
  onSend: (content: string, messageType: string, voiceDuration?: number) => void;
  isPending: boolean;
  onTyping: () => void;
}

function MessageInput({ onSend, isPending, onTyping }: MessageInputProps) {
  const [text, setText] = useState("");
  const voice = useVoiceRecorder();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSend(text.trim(), "text");
        setText("");
      }
    }
  };

  const handleSendVoice = () => {
    if (!voice.preview) return;
    onSend(voice.preview.dataUrl, "voice", voice.preview.duration);
    voice.clearPreview();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Voice preview mode
  if (voice.preview) {
    return (
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg mb-3">
          <Radio className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <WaveformBars isPlaying={false} count={24} />
          <span className="text-xs font-mono text-muted-foreground">
            {formatTime(voice.preview.duration)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={voice.cancel} className="flex-1">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSendVoice} disabled={isPending} className="flex-1" data-testid="button-send-voice">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Voice Message"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border p-4 bg-card">
      {voice.recording && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-sm text-red-400 font-medium">Recording...</span>
          <WaveformBars isPlaying={true} count={20} />
          <span className="text-xs font-mono text-red-400 ml-auto">{formatTime(voice.elapsed)}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={voice.stop}
            className="h-7 text-red-400 hover:text-red-300"
            data-testid="button-stop-recording"
          >
            Stop
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={e => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
          className="flex-1 min-h-[40px] max-h-32 resize-none text-sm"
          rows={1}
          disabled={voice.recording}
          data-testid="input-message"
        />
        <button
          onClick={voice.recording ? voice.stop : voice.start}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
            voice.recording
              ? "bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
              : "bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
          title={voice.recording ? "Stop recording" : "Record voice message"}
          data-testid="button-mic"
        >
          {voice.recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          onClick={() => {
            if (text.trim()) {
              onSend(text.trim(), "text");
              setText("");
            }
          }}
          disabled={!text.trim() || isPending}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          data-testid="button-send"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Center Panel — Message Thread ────────────────────────────────────────────

function MessageThread({
  room,
  messages,
  typingNames,
  onSend,
  isSending,
  onTyping,
  onToggleInfo,
  showInfo,
}: {
  room: ChatRoom;
  messages: ChatMessage[];
  typingNames: string[];
  onSend: (content: string, messageType: string, voiceDuration?: number) => void;
  isSending: boolean;
  onTyping: () => void;
  onToggleInfo: () => void;
  showInfo: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, typingNames.length]);

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <Hash className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{room.name}</h2>
          {room.description && (
            <p className="text-xs text-muted-foreground truncate">{room.description}</p>
          )}
        </div>
        <button
          onClick={onToggleInfo}
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center transition-all",
            showInfo
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          data-testid="button-room-info"
          title="Room Info"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Be the first to say something in {room.name}
            </p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <TypingIndicator names={typingNames} />
      </div>

      {/* Input */}
      <MessageInput onSend={onSend} isPending={isSending} onTyping={onTyping} />
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────

const SENDER_NAME = "Greg K.";
const SENDER_TYPE = "human";
const SENDER_ID = 1;

export default function Chat() {
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch room list
  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
    queryFn: () => apiRequest("GET", "/api/chat/rooms").then(r => r.json()),
    refetchInterval: 5000,
  });

  // Auto-select first room
  useEffect(() => {
    if (rooms.length > 0 && !activeRoom) {
      setActiveRoom(rooms[0]);
    }
  }, [rooms, activeRoom]);

  // Fetch messages when room changes
  useEffect(() => {
    if (!activeRoom) return;
    apiRequest("GET", `/api/chat/rooms/${activeRoom.id}/messages`)
      .then(r => r.json())
      .then(msgs => setMessages(msgs));
  }, [activeRoom?.id]);

  // WebSocket connection
  useEffect(() => {
    if (!activeRoom) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId: activeRoom.id, agentId: SENDER_ID }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message" && data.roomId === activeRoom.id) {
          setMessages(prev => [...prev, data.message]);
        }
        if (data.type === "typing" && data.roomId === activeRoom.id) {
          const name = data.senderName;
          if (name && name !== SENDER_NAME) {
            setTypingNames(prev => [...new Set([...prev, name])]);
            setTimeout(() => {
              setTypingNames(prev => prev.filter(n => n !== name));
            }, 3000);
          }
        }
      } catch (_) {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [activeRoom?.id]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      messageType,
      voiceDuration,
    }: {
      content: string;
      messageType: string;
      voiceDuration?: number;
    }) => {
      if (!activeRoom) return;
      const body: Record<string, unknown> = {
        content,
        messageType,
        senderName: SENDER_NAME,
        senderType: SENDER_TYPE,
        senderId: SENDER_ID,
      };
      if (voiceDuration !== undefined) body.voiceDuration = voiceDuration;
      const res = await apiRequest("POST", `/api/chat/rooms/${activeRoom.id}/messages`, body);
      return res.json();
    },
    onSuccess: (msg) => {
      if (msg) {
        // Message will arrive via WebSocket broadcast, but also add locally for instant feedback
        // Skip if WS is open (already received)
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          setMessages(prev => [...prev, msg]);
        }
      }
    },
  });

  const handleSend = (content: string, messageType: string, voiceDuration?: number) => {
    sendMutation.mutate({ content, messageType, voiceDuration });
  };

  const handleTyping = () => {
    if (!activeRoom || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({ type: "typing", roomId: activeRoom.id, senderName: SENDER_NAME })
    );
  };

  const handleSelectRoom = (room: ChatRoom) => {
    setActiveRoom(room);
    setMessages([]);
    setTypingNames([]);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Room List (220px) */}
      <div className="w-[220px] flex-shrink-0">
        <RoomList
          rooms={rooms}
          activeRoomId={activeRoom?.id ?? null}
          onSelectRoom={handleSelectRoom}
          onNewRoom={() => setNewRoomOpen(true)}
        />
      </div>

      {/* Center: Message Thread */}
      <div className="flex-1 min-w-0">
        {activeRoom ? (
          <MessageThread
            room={activeRoom}
            messages={messages}
            typingNames={typingNames}
            onSend={handleSend}
            isSending={sendMutation.isPending}
            onTyping={handleTyping}
            onToggleInfo={() => setShowInfo(v => !v)}
            showInfo={showInfo}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Select a room to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Room Info (200px, collapsible) */}
      {showInfo && activeRoom && (
        <div className="w-[200px] flex-shrink-0 hidden md:block">
          <RoomInfoPanel room={activeRoom} />
        </div>
      )}

      {/* New Room Dialog */}
      <NewRoomDialog
        open={newRoomOpen}
        onClose={() => setNewRoomOpen(false)}
        onCreated={(room) => setActiveRoom(room)}
      />
    </div>
  );
}
