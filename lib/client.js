// Browser half of the turn-rail surface plugin. Loaded by the web shell's
// module loader as a boot-graph entry (see package.json `dsh.client`).
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-turn-rail",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		let React = require("react");

		const TURN_RAIL_CSS = [
			".dyn-turnrail { z-index: 60; transition: height 220ms ease, top 220ms ease; }",
			".dyn-turnrail::before { content: \"\"; position: absolute; inset: -7px; border-radius: 999px; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16); opacity: 0; pointer-events: none; transition: opacity 160ms ease; }",
			".dyn-turnrail:hover::before { opacity: 0.95; }",
			".dyn-turnrail-track { position: absolute; left: 50%; top: 3px; bottom: 3px; width: calc(var(--dyn-tr-u, 10px) * 0.22); transform: translateX(-50%); border-radius: 999px; background: linear-gradient(180deg, transparent 0%, var(--dsw-alias-border-l2) 12%, var(--dsw-alias-border-l2) 88%, transparent 100%); opacity: 0.5; transition: opacity 160ms ease; }",
			".dyn-turnrail:hover .dyn-turnrail-track { opacity: 0.75; }",
			".dyn-turnrail-progress { position: absolute; left: 50%; top: 3px; width: calc(var(--dyn-tr-u, 10px) * 0.22); transform: translateX(-50%); border-radius: 999px; background: var(--dsw-alias-brand-primary); opacity: 0.85; transition: height 220ms ease; }",
			".dyn-turnrail-item { box-sizing: border-box; position: absolute; left: 50%; width: calc(var(--dyn-tr-u, 10px) * 0.9); height: calc(var(--dyn-tr-u, 10px) * 0.9); padding: 0; margin: 0; border: calc(var(--dyn-tr-u, 10px) * 0.16) solid var(--dsw-alias-label-secondary); border-radius: 999px; background: var(--dsw-alias-bg-layer-1); cursor: pointer; transform: translate(-50%, -50%); transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease; }",
			".dyn-turnrail-item:hover { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); transform: translate(-50%, -50%) scale(1.25); }",
			".dyn-turnrail-item.dyn-turnrail-active { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); width: calc(var(--dyn-tr-u, 10px) * 1.15); height: calc(var(--dyn-tr-u, 10px) * 1.15); box-shadow: 0 0 0 calc(var(--dyn-tr-u, 10px) * 0.18) var(--dsw-alias-bg-layer-1), 0 0 calc(var(--dyn-tr-u, 10px) * 0.6) 0 var(--dsw-alias-brand-primary); }",
			".dyn-turnrail-tipwrap { position: absolute; right: calc(100% + 14px); top: 50%; transform: translateY(-50%); pointer-events: auto; cursor: pointer; animation: dyn-tr-tip-in 140ms ease; }",
			".dyn-turnrail-tipwrap::after { content: \"\"; position: absolute; left: 100%; top: 50%; width: calc(6px + var(--dyn-tr-u, 10px) * 0.12); height: calc(6px + var(--dyn-tr-u, 10px) * 0.12); margin-top: calc(-3px - var(--dyn-tr-u, 10px) * 0.06); transform: translateX(-50%) rotate(45deg); background: var(--dsw-alias-bg-overlay); border-top: 1px solid var(--dsw-alias-border-l2); border-right: 1px solid var(--dsw-alias-border-l2); }",
			".dyn-turnrail-tip { box-sizing: border-box; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: calc(6px + var(--dyn-tr-u, 10px) * 0.12) calc(9px + var(--dyn-tr-u, 10px) * 0.22); font-size: calc(11px + var(--dyn-tr-u, 10px) * 0.25); line-height: calc(17px + var(--dyn-tr-u, 10px) * 0.3); color: var(--dsw-alias-label-primary); width: max-content; max-width: calc(340px + var(--dyn-tr-u, 10px) * 6); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08); }",
			"@keyframes dyn-tr-tip-in { from { opacity: 0; } to { opacity: 1; } }",
		].join("\n");

		/** Inject the rail stylesheet; returns a disposer removing the tag. */
		function injectCss() {
			if (typeof document === "undefined") return;
			const tag = document.createElement("style");
			tag.dataset.dshTurnRail = "true";
			tag.textContent = TURN_RAIL_CSS;
			document.head.appendChild(tag);
			return () => { tag.remove(); };
		}

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === undefined) return;

			// ---------- package-local shared feed (feeder slot -> overlay rail) ----------
			const listeners = new Set();
			let shared = { markers: [], sessionId: null };
			function setShared(next) {
				shared = next;
				for (const listener of listeners) listener();
			}
			function useShared() {
				const [snap, setSnap] = React.useState(shared);
				React.useEffect(() => {
					const update = () => setSnap(shared);
					listeners.add(update);
					update();
					return () => { listeners.delete(update); };
				}, []);
				return snap;
			}

			// ---------- turn-marker extraction from the ConversationSnapshot ----------
			let cachedOrder = null;
			let cachedTimeline = null;
			let cachedMarkers = [];

			function firstTextOf(node) {
				try {
					const content = node === null || node === undefined ? undefined : node.data === null || node.data === undefined ? undefined : node.data.content;
					if (Array.isArray(content)) {
						for (let i = 0; i < content.length; i++) {
							const part = content[i];
							if (part !== null && typeof part === "object" && typeof part.text === "string" && part.text.trim() !== "") {
								return part.text.trim().slice(0, 160);
							}
						}
					}
				} catch (err) { /* keep silent */ }
				return "";
			}

			function sameMarkers(a, b) {
				if (a.length !== b.length) return false;
				for (let i = 0; i < a.length; i++) {
					if (a[i].key !== b[i].key || a[i].turn !== b[i].turn || a[i].preview !== b[i].preview) return false;
				}
				return true;
			}

			function computeMarkers(snapshot) {
				const chat = snapshot === null || snapshot === undefined ? undefined : snapshot.chat;
				if (chat === null || chat === undefined) return [];
				const nodes = chat.nodes;
				if (nodes === null || nodes === undefined || typeof nodes.get !== "function") return [];
				const order = Array.isArray(chat.order) ? chat.order : [];
				const timeline = chat.timeline;
				const turnOrder = timeline !== null && timeline !== undefined && Array.isArray(timeline.turnOrder) ? timeline.turnOrder : null;
				const markers = [];
				if (turnOrder !== null && turnOrder.length > 0) {
					const firstByTurn = new Map();
					const firstUserByTurn = new Map();
					for (let i = 0; i < order.length; i++) {
						const node = nodes.get(order[i]);
						if (node === null || node === undefined) continue;
						const loc = node.location;
						const turn = loc !== null && loc !== undefined && (loc.kind === "turn" || loc.kind === "step") && loc.turn !== null && loc.turn !== undefined ? loc.turn.turn : undefined;
						if (typeof turn !== "number") continue;
						if (!firstByTurn.has(turn)) firstByTurn.set(turn, node);
						if ((node.kind === "user" || node.kind === "steering") && !firstUserByTurn.has(turn)) firstUserByTurn.set(turn, node);
					}
					for (let i = 0; i < turnOrder.length; i++) {
						// Prefer the turn's own user message (context/assistant nodes can open a turn);
						// fall back to the first node only when the turn has no user message.
						const userNode = firstUserByTurn.get(turnOrder[i]);
						const node = userNode !== undefined ? userNode : firstByTurn.get(turnOrder[i]);
						if (node === null || node === undefined) continue;
						if (node.visibility === "hidden") continue;
						markers.push({ key: node.key, turn: turnOrder[i], preview: firstTextOf(node) });
					}
				} else {
					let n = 0;
					for (let i = 0; i < order.length; i++) {
						const node = nodes.get(order[i]);
						if (node === null || node === undefined) continue;
						if (node.kind !== "user") continue;
						n += 1;
						markers.push({ key: node.key, turn: n, preview: firstTextOf(node) });
					}
				}
				return markers;
			}

			function markersOf(snapshot) {
				const chat = snapshot === null || snapshot === undefined ? undefined : snapshot.chat;
				const order = chat === null || chat === undefined ? undefined : chat.order;
				const timeline = chat === null || chat === undefined ? undefined : chat.timeline;
				if (order !== cachedOrder || timeline !== cachedTimeline) {
					cachedOrder = order;
					cachedTimeline = timeline;
					const fresh = computeMarkers(snapshot);
					// Keep the previous reference when nothing user-visible changed, so
					// streaming flushes that rebuild the node order do not re-render the rail.
					if (!sameMarkers(cachedMarkers, fresh)) cachedMarkers = fresh;
				}
				return cachedMarkers;
			}

			// ---------- session-scoped feeder: reads turns, renders nothing ----------
			function TurnFeeder(props) {
				const useSession = props.useSession;
				const sessionId = props.sessionId;
				const markers = useSession(markersOf);
				React.useEffect(() => {
					setShared({ markers: Array.isArray(markers) ? markers : [], sessionId: typeof sessionId === "string" ? sessionId : null });
				}, [markers, sessionId]);
				return null;
			}

			// ---------- overlay rail ----------
			function findScrollport() {
				if (typeof document === "undefined") return null;
				const rows = document.querySelectorAll("[data-chat-anchor-key]");
				for (let i = 0; i < rows.length; i++) {
					const sp = rows[i].closest("[data-conversation-scroll]");
					if (sp !== null) return sp;
				}
				const candidates = document.querySelectorAll("[data-conversation-scroll]");
				return candidates.length > 0 ? candidates[0] : null;
			}

			function computeActive(markers, positions, scrollTop, clientH) {
				let key = null;
				let index = 0;
				const threshold = scrollTop + clientH * 0.4;
				for (let i = 0; i < markers.length; i++) {
					const pos = positions.get(markers[i].key);
					if (typeof pos !== "number") continue;
					if (pos <= threshold) { key = markers[i].key; index = i; }
					else break;
				}
				if (key === null) key = markers.length > 0 ? markers[0].key : null;
				return { key: key, index: index };
			}

			function TurnRail() {
				const { markers, sessionId } = useShared();
				const [frame, setFrame] = React.useState(null);
				const frameRef = React.useRef(null);
				const markersRef = React.useRef(markers);
				const [active, setActive] = React.useState({ key: null, index: 0 });
				const activeRef = React.useRef(active);
				const lastPosMeasureRef = React.useRef(0);
				const [hoverKey, setHoverKey] = React.useState(null);

				React.useEffect(() => {
					markersRef.current = markers;
				}, [markers]);

				const measure = React.useCallback(() => {
					const sp = findScrollport();
					if (sp === null) {
						frameRef.current = null;
						setFrame(null);
						return null;
					}
					const rect = sp.getBoundingClientRect();
					const positions = new Map();
					const rows = sp.querySelectorAll("[data-chat-anchor-key]");
					for (let i = 0; i < rows.length; i++) {
						const key = rows[i].getAttribute("data-chat-anchor-key");
						if (key !== null && !positions.has(key)) {
							const r = rows[i].getBoundingClientRect();
							positions.set(key, r.top - rect.top + sp.scrollTop);
						}
					}
					// Composer seat: when visible at the bottom of the scrollport, the
					// rail must float above it instead of overlapping it.
					let composerTop = null;
					const seat = sp.querySelector("[data-composer-seat]");
					if (seat !== null) composerTop = seat.getBoundingClientRect().top - rect.top;
					const next = {
						top: rect.top,
						right: rect.right,
						clientH: sp.clientHeight,
						contentH: sp.scrollHeight,
						composerTop: composerTop,
						positions: positions,
					};
					frameRef.current = next;
					setFrame(next);
					const computed = computeActive(markersRef.current, positions, sp.scrollTop, sp.clientHeight);
					if (computed.key !== activeRef.current.key) {
						activeRef.current = computed;
						setActive(computed);
					}
					return sp;
				}, []);

				React.useEffect(() => {
					const sp = measure();
					if (sp === null) return;
					const onScroll = () => {
						const f = frameRef.current;
						if (f === null) return;
						// Content grew (streaming): re-measure anchor positions, throttled.
						if (sp.scrollHeight !== f.contentH) {
							const now = Date.now();
							if (now - lastPosMeasureRef.current > 250) {
								lastPosMeasureRef.current = now;
								measure();
								return;
							}
						}
						// Only update state when the active turn actually changes; plain
						// scrolling does not need a re-render.
						const computed = computeActive(markersRef.current, f.positions, sp.scrollTop, f.clientH);
						if (computed.key !== activeRef.current.key) {
							activeRef.current = computed;
							setActive(computed);
						}
					};
					const onResize = () => { measure(); };
					sp.addEventListener("scroll", onScroll, { passive: true });
					let observer = null;
					if (typeof ResizeObserver !== "undefined") {
						observer = new ResizeObserver(() => { measure(); });
						observer.observe(sp);
					}
					window.addEventListener("resize", onResize);
					return () => {
						sp.removeEventListener("scroll", onScroll);
						if (observer !== null) observer.disconnect();
						window.removeEventListener("resize", onResize);
					};
				}, [markers, sessionId, measure]);

				const jump = (key) => {
					const sp = findScrollport();
					if (sp === null) return;
					// Live target: measure the anchor right now instead of trusting the
					// cached coordinates (stale after reflows, paging, or streaming).
					let goal = null;
					const spRect = sp.getBoundingClientRect();
					const rows = sp.querySelectorAll("[data-chat-anchor-key]");
					for (let i = 0; i < rows.length; i++) {
						if (rows[i].getAttribute("data-chat-anchor-key") === key) {
							goal = Math.max(0, rows[i].getBoundingClientRect().top - spRect.top + sp.scrollTop - 8);
							break;
						}
					}
					if (goal === null) {
						const f = frameRef.current;
						const cached = f === null ? undefined : f.positions.get(key);
						if (typeof cached === "number") goal = Math.max(0, cached - 8);
					}
					if (goal === null) return;
					const start = sp.scrollTop;
					if (Math.abs(goal - start) <= 32) { sp.scrollTop = goal; return; }
					// Nudge out of the app's follow-to-bottom zone (its threshold is 25px)
					// before animating, so its scroll handler flips atBottom off and cannot
					// cancel the smooth scroll mid-flight.
					const floorTop = Math.max(0, sp.scrollHeight - sp.clientHeight);
					sp.scrollTop = goal > start ? Math.min(start + 30, floorTop) : Math.max(start - 30, 0);
					try { sp.scrollTo({ top: goal, behavior: "smooth" }); }
					catch (err) { sp.scrollTop = goal; }
					// Verify the scroll really moved; if the app's follow-to-bottom logic
					// cancelled it, force an instant jump as a fallback.
					let frames = 0;
					const verify = () => {
						frames += 1;
						if (Math.abs(sp.scrollTop - goal) <= 4) return;
						if (frames > 30 && Math.abs(sp.scrollTop - start) <= 2) {
							try { sp.scrollTo({ top: goal }); }
							catch (err2) { sp.scrollTop = goal; }
							return;
						}
						if (frames < 150 && typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(verify);
					};
					if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(verify);
				};

				if (markers.length === 0 || frame === null) return null;
				if (frame.positions.size === 0) return null;
				if (frame.contentH - frame.clientH < 24) return null;
				const usable = frame.clientH - 24;
				if (usable <= 0) return null;
				// Size unit scales with the scrollport height (10-24px), so dots stay
				// comfortable on 4K displays and small windows alike.
				const unit = Math.max(10, Math.min(24, Math.round(frame.clientH / 60)));
				const gap = unit + 8;
				const desired = markers.length * gap;
				let railH = Math.max(Math.round(unit * 2.8), Math.min(usable, desired));
				// Shrink the rail while the composer is visible at the bottom so the
				// bottom dots never sit on top of the input area.
				if (frame.composerTop !== null && frame.composerTop < frame.clientH) {
					railH = Math.min(railH, Math.max(0, frame.composerTop - 24));
				}
				if (railH < 24) return null;
				const railW = Math.round(unit * 1.5);
				let top = Math.round(frame.top + (frame.clientH - railH) / 2);
				if (frame.composerTop !== null && frame.composerTop < frame.clientH) {
					top = Math.min(top, Math.round(frame.top + frame.composerTop - 10 - railH));
				}
				// Inset 14px from the column edge so the rail never covers the scrollbar.
				const right = Math.max(6, Math.round(window.innerWidth - frame.right + 14));
				const activeKey = active.key;
				const progressPct = (((active.index + 0.5) / markers.length) * 100).toFixed(1);

				const children = [];
				children.push(React.createElement("div", { key: "track", className: "dyn-turnrail-track" }));
				children.push(React.createElement("div", { key: "progress", className: "dyn-turnrail-progress", style: { height: progressPct + "%" } }));
				for (let i = 0; i < markers.length; i++) {
					const m = markers[i];
					const pos = frame.positions.get(m.key);
					if (typeof pos !== "number") continue;
					// Even spacing: dots divide the rail into equal segments regardless of content length.
					const pct = (i + 0.5) / markers.length;
					const isActive = m.key === activeKey;
					const isHover = m.key === hoverKey;
					const itemChildren = [];
					if (isHover) {
						let wrapStyle = null;
						if (pct < 0.15) wrapStyle = { top: "2px", transform: "none" };
						else if (pct > 0.85) wrapStyle = { top: "auto", bottom: "2px", transform: "none" };
						itemChildren.push(React.createElement("div", { className: "dyn-turnrail-tipwrap", style: wrapStyle, "aria-hidden": true },
							React.createElement("div", { className: "dyn-turnrail-tip" }, m.preview !== "" ? m.preview : ("第 " + m.turn + " 轮")),
						));
					}
					children.push(React.createElement("button", {
						key: m.key,
						type: "button",
						className: "dyn-turnrail-item" + (isActive ? " dyn-turnrail-active" : ""),
						style: { top: (pct * railH).toFixed(1) + "px" },
						"aria-label": "跳转到第 " + m.turn + " 轮",
						onClick: () => { jump(m.key); },
						onMouseEnter: () => { setHoverKey(m.key); },
						onMouseLeave: () => { setHoverKey(null); },
					}, itemChildren));
				}

				return React.createElement("div", {
					className: "dyn-turnrail",
					role: "navigation",
					"aria-label": "会话轮次导航",
					style: {
						position: "fixed",
						top: top + "px",
						right: right + "px",
						height: railH + "px",
						width: railW + "px",
						pointerEvents: "auto",
						"--dyn-tr-u": unit + "px",
					},
					onMouseLeave: () => { setHoverKey(null); },
				}, children);
			}

			// ---------- styles + slot registrations (lifecycle-owned) ----------
			ctx.effect(injectCss);
			const disposers = [];
			disposers.push(slots.inject("conversation.session.header.utilities", () => slots.register(
				{ name: "conversation.session.header.utilities", id: "dyn-turnrail-feeder", order: 100 },
				TurnFeeder,
			)));
			disposers.push(slots.inject("shell.overlay", () => slots.register(
				{ name: "shell.overlay", id: "dyn-turnrail", order: 100 },
				TurnRail,
			)));
			ctx.effect(() => () => {
				for (let i = 0; i < disposers.length; i++) disposers[i]();
			});
		}

		exports.apply = apply;
		return module.exports;
	}
});
