import { Check, ChevronDown, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APP_LINKS } from "../../app/appLinks";
import { appHref } from "../../app/routeRegistry";

const SHORT_LABELS: Record<string, string> = {
  Browser: "Web",
  Computer: "PC",
  Marketplace: "Market",
  Pay2Speak: "Speak",
};

function currentHref() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function DomainNav({ compact = false }: { compact?: boolean }) {
  const current = currentHref();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLink =
    APP_LINKS.find((link) => current === link.localHref) ?? APP_LINKS[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <nav
      className={[
        "domain-nav",
        "app-menu-nav",
        compact ? "compact" : "",
        open ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="ProofOfWork.Me domains"
      ref={containerRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="app-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="app-menu-trigger-icon" aria-hidden="true">
          <Menu size={15} />
        </span>
        <strong>{activeLink.label}</strong>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      <div className="app-menu-popover" role="menu">
        <div className="app-menu-list">
          {APP_LINKS.map((link) => {
            const active = current === link.localHref;
            return (
              <a
                aria-current={active ? "page" : undefined}
                data-short={SHORT_LABELS[link.label] ?? link.label}
                href={appHref(link.href, link.localHref)}
                key={link.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                title={link.label}
              >
                <span>
                  <strong>{link.label}</strong>
                  <small>{appHref(link.href, link.localHref)}</small>
                </span>
                {active ? <Check size={15} aria-hidden="true" /> : null}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
