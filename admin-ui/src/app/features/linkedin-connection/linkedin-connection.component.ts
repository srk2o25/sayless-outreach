import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from "@angular/core";
import { DatePipe, NgForOf, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Observable, catchError, of } from "rxjs";
import { LinkedinConnectionService } from "../../core/services/linkedin-connection.service";
import { LinkedInConnectionStatus } from "../../core/models/linkedin-connection.model";
import { EmailAccountsService } from "../../core/services/email-accounts.service";
import { EmailAccount } from "../../core/models/email-account.model";

// Fixed to match connect-session.ts's launched viewport exactly — no scaling
// math between what's shown and what CDP needs. Resizing is a fast-follow.
const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 768;

type View = "closed" | "picker" | "credentials-form" | "code-prompt" | "canvas";

@Component({
  selector: "cad-linkedin-connection",
  standalone: true,
  imports: [NgIf, NgForOf, DatePipe, FormsModule],
  templateUrl: "./linkedin-connection.component.html",
  styleUrl: "./linkedin-connection.component.scss",
})
export class LinkedinConnectionComponent implements OnInit, OnDestroy {
  @ViewChild("canvas") private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly linkedinConnectionService = inject(LinkedinConnectionService);
  private readonly emailAccountsService = inject(EmailAccountsService);

  protected status: LinkedInConnectionStatus | null = null;
  protected loading = true;
  protected disconnecting = false;
  protected emailAccounts: EmailAccount[] = [];
  protected loadingEmail = true;

  protected view: View = "closed";
  protected credEmail = "";
  protected credPassword = "";
  protected credentialsError: string | null = null;
  protected submittingCredentials = false;
  protected codeValue = "";

  protected loginSuccess = false;
  protected errorMessage: string | null = null;
  protected readonly canvasWidth = VIEWPORT_WIDTH;
  protected readonly canvasHeight = VIEWPORT_HEIGHT;

  private socket: WebSocket | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;

  public ngOnInit(): void {
    this.loadStatus();
    this.loadEmailAccounts();
  }

  public ngOnDestroy(): void {
    this.closeSocket();
  }

  protected openPicker(): void {
    this.errorMessage = null;
    this.loginSuccess = false;
    this.credentialsError = null;
    this.view = "picker";
  }

  protected closeModal(): void {
    if (this.socket) {
      this.cancelConnect();
    }
    this.view = "closed";
  }

  // "Full Browser Login" is hidden from the picker for now (Credentials Login
  // covers the common case) — this stays wired up, not deleted, since
  // fallback_required in handleMessage() still routes into this same
  // 'canvas' view when credentials login hits something it can't handle.
  protected chooseLive(): void {
    this.view = "canvas";
    this.openSocket({ type: "start", mode: "live" });
  }

  protected disconnectAccount(): void {
    this.disconnecting = true;
    this.linkedinConnectionService
      .disconnect()
      .pipe(
        catchError((): Observable<LinkedInConnectionStatus | null> => {
          return of(null);
        })
      )
      .subscribe((status: LinkedInConnectionStatus | null) => {
        this.disconnecting = false;
        if (status) this.status = status;
      });
  }

  protected chooseCredentials(): void {
    this.credentialsError = null;
    this.view = "credentials-form";
  }

  protected submitCredentials(): void {
    this.credentialsError = null;
    this.submittingCredentials = true;
    this.openSocket({
      type: "start",
      mode: "credentials",
      email: this.credEmail,
      password: this.credPassword,
    });
  }

  protected submitCode(): void {
    this.sendInput({ type: "code", value: this.codeValue });
  }

  protected cancelConnect(): void {
    this.socket?.send(JSON.stringify({ type: "cancel" }));
    this.closeSocket();
    this.submittingCredentials = false;
    this.view = "closed";
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

  private openSocket(startMessage: Record<string, unknown>): void {
    const socket = this.linkedinConnectionService.openConnectSocket();
    this.socket = socket;

    socket.onopen = (): void => {
      socket.send(JSON.stringify(startMessage));
    };
    socket.onmessage = (event: MessageEvent<string>): void => {
      this.handleMessage(JSON.parse(event.data));
    };
    socket.onerror = (): void => {
      this.errorMessage = "Connection to linkedin-worker failed.";
      this.submittingCredentials = false;
    };
    socket.onclose = (): void => {
      this.submittingCredentials = false;
    };
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
        this.view = "closed";
        this.submittingCredentials = false;
        this.closeSocket();
        this.loadStatus();
        break;
      case "invalid_credentials":
        this.credentialsError = "Incorrect email or password.";
        this.submittingCredentials = false;
        this.view = "credentials-form";
        this.closeSocket();
        break;
      case "need_code":
        this.submittingCredentials = false;
        this.codeValue = "";
        this.view = "code-prompt";
        break;
      case "fallback_required":
        // Same still-open socket — just switch which view renders so the
        // canvas picks up whatever LinkedIn is already showing.
        this.view = "canvas";
        break;
      case "error":
        this.errorMessage = msg.reason ?? "Connect session failed.";
        this.submittingCredentials = false;
        this.view = "closed";
        this.closeSocket();
        break;
      case "timeout":
        this.errorMessage = "Connect session timed out — try again.";
        this.submittingCredentials = false;
        this.view = "closed";
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

  private loadEmailAccounts(): void {
    this.loadingEmail = true;
    this.emailAccountsService
      .listEmailAccounts()
      .pipe(
        catchError((): Observable<EmailAccount[]> => {
          return of([]);
        })
      )
      .subscribe((accounts: EmailAccount[]) => {
        this.emailAccounts = accounts;
        this.loadingEmail = false;
      });
  }
}
