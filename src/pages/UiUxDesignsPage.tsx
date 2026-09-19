import { Link, Navigate, useParams } from "react-router-dom";
import {
  firstToolPath,
  getTool,
  isUiUxSurface,
  isUiUxTool,
  toolsForSurface,
  UIUX_SURFACES,
  type UiUxSurface,
  type UiUxToolId,
} from "../lib/uiux";
import {
  UiUxCmsPageTool,
  UiUxFaqTool,
  UiUxIconsTool,
  UiUxPushTool,
  UiUxThemeTool,
} from "./UiUxToolPanels";
import { UiUxBannerFrameTool } from "./BannerFrameTool";
import { BannersPage } from "./BannerManagementPage";

function ToolShell({
  surface,
  toolId,
  children,
}: {
  surface: UiUxSurface;
  toolId: UiUxToolId;
  children: React.ReactNode;
}) {
  const meta = UIUX_SURFACES[surface];
  const tool = getTool(toolId);
  const siblings = toolsForSurface(surface);
  return (
    <div className="page uiux-page">
      <header className="page-head">
        <div className="uiux-page-head-copy">
          <p className="settings-crumb">
            <Link to={firstToolPath(surface)}>UI UX Designs</Link>
            {" · "}
            {meta.title}
          </p>
          <h1 className="page-title">{tool.label}</h1>
          <p className="page-sub">{tool.desc}</p>
        </div>
      </header>
      {siblings.length > 1 ? (
        <nav className="uiux-tool-chips" aria-label={`${meta.title} tools`}>
          {siblings.map((t) => (
            <Link
              key={t.id}
              to={`/ui-ux-designs/${surface}/${t.id}`}
              className={`uiux-tool-chip${t.id === toolId ? " is-active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <div className="uiux-page-body">{children}</div>
    </div>
  );
}

export function UiUxDesignsPage() {
  const { surface, tool } = useParams();
  if (!isUiUxSurface(surface)) {
    return <Navigate to={firstToolPath("banners")} replace />;
  }

  if (surface === "app-and-web" || surface === "admin") {
    if (tool && isUiUxTool(tool)) {
      const dest = getTool(tool).surfaces[0] ?? "banners";
      return <Navigate to={`/ui-ux-designs/${dest}/${tool}`} replace />;
    }
    return <Navigate to={firstToolPath("banners")} replace />;
  }

  // Category banners live under Categories management, not UI UX.
  if (tool === "category-banners") {
    return <Navigate to="/categories" replace />;
  }

  if (!tool) {
    return <Navigate to={firstToolPath(surface)} replace />;
  }

  if (tool === "web-banners") {
    return <Navigate to="/ui-ux-designs/banners/mobile-banners" replace />;
  }

  if (!isUiUxTool(tool)) {
    return <Navigate to={firstToolPath(surface)} replace />;
  }

  const def = getTool(tool);
  if (!def.surfaces.includes(surface)) {
    const dest = def.surfaces[0];
    return <Navigate to={dest ? `/ui-ux-designs/${dest}/${tool === "web-banners" ? "mobile-banners" : tool}` : firstToolPath(surface)} replace />;
  }

  if (def.kind === "banners") {
    return (
      <ToolShell surface={surface} toolId={tool}>
        <BannersPage
          embedded
          initialTypes={def.bannerTypes}
          crumbLabel={def.label}
          surfaceLabel={UIUX_SURFACES[surface].title}
          surfacePath={firstToolPath(surface)}
        />
      </ToolShell>
    );
  }

  if (def.kind === "banner-frame") {
    return (
      <ToolShell surface={surface} toolId={tool}>
        <UiUxBannerFrameTool surface={surface} />
      </ToolShell>
    );
  }

  if (def.kind === "push") {
    return (
      <ToolShell surface={surface} toolId={tool}>
        <UiUxPushTool />
      </ToolShell>
    );
  }

  if (def.kind === "theme") {
    return (
      <ToolShell surface={surface} toolId={tool}>
        <UiUxThemeTool surface={surface} />
      </ToolShell>
    );
  }

  if (def.kind === "icons") {
    return (
      <ToolShell surface={surface} toolId={tool}>
        <UiUxIconsTool surface={surface} />
      </ToolShell>
    );
  }

  if (def.kind === "faq") {
    return (
      <ToolShell surface={surface} toolId={tool}>
        <UiUxFaqTool />
      </ToolShell>
    );
  }

  if (def.kind === "cms-page" && def.pageKey) {
    return (
      <ToolShell surface={surface} toolId={tool}>
        <UiUxCmsPageTool pageKey={def.pageKey} />
      </ToolShell>
    );
  }

  return <Navigate to={firstToolPath(surface)} replace />;
}
