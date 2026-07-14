from __future__ import annotations

from pathlib import Path
import os


DELTA_THEME = {
    "background": "#0c0e0f",
    "surface": "#13181a",
    "surface_alt": "#0f1416",
    "border": "#212a2e",
    "border_soft": "#1a2226",
    "text": "#e9eef0",
    "muted": "#8d9ba1",
    "dim": "#56646b",
    "accent": "#2be08c",
    "accent_hover": "#5defae",
    "accent_text": "#03130a",
}

DELTA_LAYOUT = {
    "sites_text_width": 1,
    "sites_min_width": 320,
    "jobs_min_width": 150,
}


def format_control_snapshot(snapshot: dict) -> dict[str, str]:
    seconds = max(0, int(snapshot.get("pairing_seconds") or 0))
    origins = snapshot.get("origins") or []
    service = str(snapshot.get("service") or "").removeprefix("http://")
    return {
        "service": service,
        "version": str(snapshot.get("version") or "-"),
        "pairing_code": str(snapshot.get("pairing_code") or "------"),
        "expiry": f"{seconds // 60:02d}:{seconds % 60:02d}",
        "paired_sites": "\n".join(item["origin"] for item in origins)
        or "尚未配对网站",
        "job_count": str(
            sum(
                job.get("state") in {"pending", "running"}
                for job in (snapshot.get("jobs") or [])
            )
        ),
    }


class ControlWindowModel:
    def __init__(
        self,
        *,
        version: str,
        port: int,
        data_dir: Path,
        pairing_manager,
        pairing_store,
        job_queue,
    ):
        self.version = version
        self.port = port
        self.data_dir = Path(data_dir)
        self.pairing_manager = pairing_manager
        self.pairing_store = pairing_store
        self.job_queue = job_queue
        self.pairing_code: str | None = None

    def issue_pairing_code(self) -> str:
        self.pairing_code = self.pairing_manager.issue_code()
        return self.pairing_code

    def revoke_origin(self, origin: str) -> bool:
        return self.pairing_store.revoke(origin)

    def stop_job(self, job_id: str):
        return self.job_queue.cancel(job_id)

    def open_data_directory(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        os.startfile(self.data_dir)

    def snapshot(self) -> dict:
        return {
            "version": self.version,
            "service": f"http://127.0.0.1:{self.port}",
            "pairing_code": self.pairing_code,
            "pairing_seconds": self.pairing_manager.remaining_seconds(),
            "origins": self.pairing_store.list_origins(),
            "jobs": self.job_queue.list(),
            "data_dir": str(self.data_dir),
        }


def run_control_window(model: ControlWindowModel) -> int:
    import tkinter as tk

    root = tk.Tk()
    root.title("Delta Companion")
    root.geometry("620x560")
    root.minsize(560, 510)
    root.configure(bg=DELTA_THEME["background"])

    display_font = "Bahnschrift"
    text_font = "Segoe UI"
    mono_font = "Consolas"

    def label(parent, text="", **options):
        defaults = {
            "bg": parent.cget("bg"),
            "fg": DELTA_THEME["text"],
            "font": (text_font, 10),
        }
        defaults.update(options)
        return tk.Label(parent, text=text, **defaults)

    def panel(parent, **options):
        defaults = {
            "bg": DELTA_THEME["surface"],
            "highlightbackground": DELTA_THEME["border_soft"],
            "highlightthickness": 1,
            "bd": 0,
        }
        defaults.update(options)
        return tk.Frame(parent, **defaults)

    def button(parent, text, command, *, primary=False):
        normal_bg = DELTA_THEME["accent"] if primary else "#1d2528"
        hover_bg = DELTA_THEME["accent_hover"] if primary else "#242e32"
        normal_fg = DELTA_THEME["accent_text"] if primary else DELTA_THEME["muted"]
        hover_fg = DELTA_THEME["accent_text"] if primary else DELTA_THEME["text"]
        control = tk.Button(
            parent,
            text=text,
            command=command,
            bg=normal_bg,
            fg=normal_fg,
            activebackground=hover_bg,
            activeforeground=hover_fg,
            relief="flat",
            bd=0,
            cursor="hand2",
            font=(display_font, 10, "bold" if primary else "normal"),
            padx=16,
            pady=10,
        )
        control.bind("<Enter>", lambda _event: control.configure(bg=hover_bg, fg=hover_fg))
        control.bind("<Leave>", lambda _event: control.configure(bg=normal_bg, fg=normal_fg))
        return control

    shell = tk.Frame(root, bg=DELTA_THEME["background"])
    shell.pack(fill="both", expand=True, padx=24, pady=22)

    brand = tk.Frame(shell, bg=DELTA_THEME["background"])
    brand.pack(fill="x")
    label(
        brand,
        "▰",
        fg=DELTA_THEME["accent"],
        font=(display_font, 12, "bold"),
    ).pack(side="left", padx=(0, 9))
    brand_copy = tk.Frame(brand, bg=DELTA_THEME["background"])
    brand_copy.pack(side="left")
    title_row = tk.Frame(brand_copy, bg=DELTA_THEME["background"])
    title_row.pack(anchor="w")
    label(
        title_row,
        "DELTA",
        font=(display_font, 17, "bold"),
    ).pack(side="left")
    label(
        title_row,
        "COMPANION",
        fg=DELTA_THEME["accent"],
        font=(display_font, 17, "bold"),
    ).pack(side="left", padx=(4, 0))
    label(
        brand_copy,
        "LOCAL BRIDGE  /  本机连接器",
        fg=DELTA_THEME["dim"],
        font=(display_font, 8),
    ).pack(anchor="w", pady=(2, 0))

    live = tk.Frame(brand, bg="#112b1d", padx=10, pady=6)
    live.pack(side="right")
    label(live, "●", bg="#112b1d", fg=DELTA_THEME["accent_hover"], font=(text_font, 8)).pack(side="left")
    label(live, "服务运行中", bg="#112b1d", fg=DELTA_THEME["accent_hover"], font=(text_font, 9, "bold")).pack(side="left", padx=(6, 0))

    status_strip = panel(shell, bg=DELTA_THEME["surface_alt"])
    status_strip.pack(fill="x", pady=(18, 12))
    service_value = label(
        status_strip,
        fg=DELTA_THEME["muted"],
        bg=DELTA_THEME["surface_alt"],
        font=(mono_font, 10),
    )
    service_value.pack(side="left", padx=14, pady=10)
    version_value = label(
        status_strip,
        fg=DELTA_THEME["dim"],
        bg=DELTA_THEME["surface_alt"],
        font=(display_font, 9, "bold"),
    )
    version_value.pack(side="right", padx=14, pady=10)

    pairing = panel(shell)
    pairing.pack(fill="x")
    pairing_inner = tk.Frame(pairing, bg=DELTA_THEME["surface"])
    pairing_inner.pack(fill="x", padx=18, pady=16)
    label(
        pairing_inner,
        "PAIRING CODE  /  配对码",
        fg=DELTA_THEME["dim"],
        font=(display_font, 9, "bold"),
    ).pack(anchor="w")
    code_row = tk.Frame(pairing_inner, bg=DELTA_THEME["surface"])
    code_row.pack(fill="x", pady=(8, 14))
    code_label = label(
        code_row,
        font=(display_font, 35, "bold"),
        fg=DELTA_THEME["accent_hover"],
    )
    code_label.pack(side="left")
    expiry_wrap = tk.Frame(code_row, bg=DELTA_THEME["surface"])
    expiry_wrap.pack(side="right", anchor="s", pady=(0, 5))
    label(expiry_wrap, "有效期", fg=DELTA_THEME["dim"], font=(text_font, 8)).pack(anchor="e")
    expiry_value = label(expiry_wrap, fg=DELTA_THEME["muted"], font=(mono_font, 11, "bold"))
    expiry_value.pack(anchor="e")

    actions = tk.Frame(pairing_inner, bg=DELTA_THEME["surface"])
    actions.pack(fill="x")
    button(actions, "生成新的配对码", model.issue_pairing_code, primary=True).pack(
        side="left", fill="x", expand=True
    )
    button(actions, "打开数据目录", model.open_data_directory).pack(
        side="left", padx=(10, 0)
    )

    overview = tk.Frame(shell, bg=DELTA_THEME["background"])
    overview.pack(fill="both", expand=True, pady=(12, 0))
    overview.grid_columnconfigure(
        0, weight=3, minsize=DELTA_LAYOUT["sites_min_width"]
    )
    overview.grid_columnconfigure(
        1, weight=2, minsize=DELTA_LAYOUT["jobs_min_width"]
    )
    overview.grid_rowconfigure(0, weight=1)

    sites_panel = panel(overview)
    sites_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
    label(sites_panel, "PAIRED SITES  /  已配对网站", fg=DELTA_THEME["dim"], font=(display_font, 9, "bold")).pack(anchor="w", padx=16, pady=(14, 8))
    sites_value = tk.Text(
        sites_panel,
        width=DELTA_LAYOUT["sites_text_width"],
        height=4,
        wrap="word",
        state="disabled",
        bg=DELTA_THEME["surface"],
        fg=DELTA_THEME["muted"],
        insertbackground=DELTA_THEME["text"],
        font=(mono_font, 9),
        relief="flat",
        bd=0,
        padx=12,
        pady=4,
    )
    sites_value.pack(fill="both", expand=True, padx=4, pady=(0, 10))

    jobs_panel = panel(overview)
    jobs_panel.grid(row=0, column=1, sticky="nsew", padx=(6, 0))
    label(jobs_panel, "ACTIVE TASKS  /  当前任务", fg=DELTA_THEME["dim"], font=(display_font, 9, "bold")).pack(anchor="w", padx=16, pady=(14, 10))
    job_count = label(jobs_panel, "0", fg=DELTA_THEME["text"], font=(display_font, 32, "bold"))
    job_count.pack(anchor="w", padx=16)
    label(jobs_panel, "单队列执行", fg=DELTA_THEME["dim"], font=(text_font, 9)).pack(anchor="w", padx=16, pady=(0, 12))

    label(
        shell,
        "仅连接本机  ·  数据保存在本地",
        fg=DELTA_THEME["dim"],
        font=(text_font, 8),
    ).pack(anchor="center", pady=(13, 0))

    def refresh():
        view = format_control_snapshot(model.snapshot())
        service_value.config(text=f"LOCAL  {view['service']}")
        version_value.config(text=f"VERSION  {view['version']}")
        code_label.config(text=view["pairing_code"])
        expiry_value.config(text=view["expiry"])
        sites_value.config(state="normal")
        sites_value.delete("1.0", "end")
        sites_value.insert("1.0", view["paired_sites"])
        sites_value.config(state="disabled")
        job_count.config(text=view["job_count"])
        root.after(1000, refresh)

    model.issue_pairing_code()
    refresh()
    root.mainloop()
    return 0
