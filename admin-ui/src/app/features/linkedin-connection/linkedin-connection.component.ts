import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from "@angular/core";
import { DatePipe, NgIf } from "@angular/common";
import { Observable, catchError, of } from "rxjs";
import { LinkedinConnectionService } from "../../core/services/linkedin-connection.service";
import { LinkedInConnectionStatus } from "../../core/models/linkedin-connection.model";

// Fixed to match connect-session.ts's launched viewport exactly — no scaling
// math between what's shown and what CDP needs. Resizing is a fast-follow.
const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 768;

@Component({
  selector: "cad-linkedin-connection",
  standalone: true,
  imports: [NgIf, DatePipe],
  templateUrl: "./linkedin-connection.component.html",
  styleUrl: "./linkedin-connection.component.scss",
})
export class LinkedinConnectionComponent implements OnInit, OnDestroy {
  @ViewChild("canvas") private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly linkedinConnectionService = inject(LinkedinConnectionService);

  protected status: LinkedInConnectionStatus | null = null;
  protected loading = true;
  protected connecting = false;
  protected loginSuccess = false;
  protected errorMessage: string | null = null;
  protected readonly canvasWidth = VIEWPORT_WIDTH;
  protected readonly canvasHeight = VIEWPORT_HEIGHT;

  private socket: WebSocket | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;

  public ngOnInit(): void {
    this.loadStatus();
  }

  public ngOnDestroy(): void {
    this.closeSocket();
  }

  protected startConnect(): void {
    this.errorMessage = null;
    this.loginSuccess = false;
    this.connecting = true;

    const socket = this.linkedinConnectionService.openConnectSocket();
    this.socket = socket;

    socket.onmessage = (event: MessageEvent<string>): void => {
      this.handleMessage(JSON.parse(event.data));
    };
    socket.onerror = (): void => {
      this.errorMessage = "Connection to linkedin-worker failed.";
      this.connecting = false;
    };
    socket.onclose = (): void => {
      this.connecting = false;
    };
  }

  protected cancelConnect(): void {
    this.socket?.send(JSON.stringify({ type: "cancel" }));
    this.closeSocket();
    this.connecting = false;
  }

  protected onCanvasMouse(event: MouseEvent, eventType: "mousePressed" | "mouseReleased" | "mouseMoved"): void {
    this.sendInput({
      type: "input",
      kind: "mouse",
      eventType,
      x: event.offsetX,
      y: event.offsetY,
      button: "left",
    });
  }

  protected onCanvasKey(event: KeyboardEvent, eventType: "keyDown" | "keyUp"): void {
    event.preventDefault();
    this.sendInput({
      type: "input",
      kind: "key",
      eventType,
      key: event.key,
      code: event.code,
      text: event.key.length === 1 ? event.key : undefined,
    });
  }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case "init":
        // Viewport is fixed (see VIEWPORT_WIDTH/HEIGHT) — nothing to resize,
        // just confirms the relay is up.
        break;
      case "frame":
        this.drawFrame(msg.data);
        break;
      case "login-success":
        this.loginSuccess = true;
        this.connecting = false;
        this.closeSocket();
        this.loadStatus();
        break;
      case "error":
        this.errorMessage = msg.reason ?? "Connect session failed.";
        this.connecting = false;
        this.closeSocket();
        break;
      case "timeout":
        this.errorMessage = "Connect session timed out — try again.";
        this.connecting = false;
        this.closeSocket();
        break;
    }
  }

  private drawFrame(base64Jpeg: string): void {
    if (!this.canvasContext) {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      this.canvasContext = canvas.getContext("2d");
      if (!this.canvasContext) return;
    }

    const bytes = atob(base64Jpeg);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
    const blob = new Blob([buffer], { type: "image/jpeg" });

    createImageBitmap(blob)
      .then((bitmap) => {
        this.canvasContext?.drawImage(bitmap, 0, 0);
        bitmap.close();
      })
      .catch(() => {
        // Dropped frame — the next one recovers, not worth surfacing.
      });
  }

  private sendInput(payload: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  private closeSocket(): void {
    this.socket?.close();
    this.socket = null;
    this.canvasContext = null;
  }

  private loadStatus(): void {
    this.loading = true;
    this.linkedinConnectionService
      .getStatus()
      .pipe(
        catchError((): Observable<LinkedInConnectionStatus | null> => {
          return of(null);
        })
      )
      .subscribe((status: LinkedInConnectionStatus | null) => {
        this.status = status;
        this.loading = false;
      });
  }
}
