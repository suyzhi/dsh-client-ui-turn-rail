// Browser half of the turn-rail surface plugin. Loaded by the web shell's
// module loader as a boot-graph entry (see package.json `dsh.client`).
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-turn-rail",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		let React = require("react");

		const TURN_RAIL_CSS = [
			".dyn-turnrail { width: 16px; z-index: 60; }",
			".dyn-turnrail-track { position: absolute; left: 7px; top: 2px; bottom: 2px; width: 2px; border-radius: 2px; background: var(--dsw-alias-border-l2); opacity: 0.45; transition: opacity 120ms ease; }",
			".dyn-turnrail:hover .dyn-turnrail-track { opacity: 0.8; }",
			".dyn-turnrail-item { position: absolute; left: 3px; width: 10px; height: 10px; padding: 0; margin: 0; border: none; border-radius: 999px; background: var(--dsw-alias-label-secondary); opacity: 0.5; cursor: pointer; transform: translateY(-50%); transition: opacity 100ms ease, background 100ms ease; }",
			".dyn-turnrail-item:hover { opacity: 1; background: var(--dsw-alias-brand-primary); }",
			".dyn-turnrail-item.dyn-turnrail-active { opacity: 1; background: var(--dsw-alias-brand-primary); width: 12px; height: 12px; left: 2px; }",
			".dyn-turnrail-tip { position: absolute; right: calc(100% + 12px); top: 50%; transform: translateY(-50%); background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 6px 10px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary); width: max-content; max-width: 420px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16); pointer-events: none; }",
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
					cachedMarkers = computeMarkers(snapshot);
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

			function TurnRail() {
				const { markers, sessionId } = useShared();
				const [frame, setFrame] = React.useState(null);
				const frameRef = React.useRef(null);
				const lastPosMeasureRef = React.useRef(0);
				const [hoverKey, setHoverKey] = React.useState(null);

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
					const next = {
						top: rect.top,
						bottom: rect.bottom,
						right: rect.right,
						clientH: sp.clientHeight,
						scrollTop: sp.scrollTop,
						contentH: sp.scrollHeight,
						positions: positions,
					};
					frameRef.current = next;
					setFrame(next);
					return sp;
				}, []);

				React.useEffect(() => {
					const sp = measure();
					if (sp === null) return;
					const onScroll = () => {
						const f = frameRef.current;
						if (f === null) return;
						const scrollTop = sp.scrollTop;
						if (Math.abs(f.scrollTop - scrollTop) > 1 || sp.scrollHeight !== f.contentH) {
							const next = {
								top: f.top,
								bottom: f.bottom,
								right: f.right,
								clientH: f.clientH,
								scrollTop: scrollTop,
								contentH: sp.scrollHeight,
								positions: f.positions,
							};
							frameRef.current = next;
							setFrame(next);
						}
						const now = Date.now();
						if (sp.scrollHeight !== f.contentH && now - lastPosMeasureRef.current > 250) {
							lastPosMeasureRef.current = now;
							measure();
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
					const f = frameRef.current;
					const target = f === null ? undefined : f.positions.get(key);
					if (typeof target === "number") {
						try { sp.scrollTo({ top: Math.max(0, target - 8), behavior: "smooth" }); }
						catch (err) { sp.scrollTop = Math.max(0, target - 8); }
						return;
					}
					const rows = sp.querySelectorAll("[data-chat-anchor-key]");
					for (let i = 0; i < rows.length; i++) {
						if (rows[i].getAttribute("data-chat-anchor-key") === key) {
							try { rows[i].scrollIntoView({ block: "start", behavior: "smooth" }); }
							catch (err) { rows[i].scrollIntoView(true); }
							return;
						}
					}
				};

				if (markers.length === 0 || frame === null) return null;
				if (frame.positions.size === 0) return null;
				if (frame.contentH - frame.clientH < 24) return null;
				const usable = frame.clientH - 24;
				if (usable <= 0) return null;
				// Rail height grows with the number of turns (comfortable ~20px per dot)
				// and compresses to the available height once turns become many.
				const desired = markers.length * 20;
				const railH = Math.max(28, Math.min(usable, desired));
				const top = Math.round(frame.top + (frame.clientH - railH) / 2);
				const right = Math.max(4, Math.round(window.innerWidth - frame.right + 8));

				let activeKey = null;
				const threshold = frame.scrollTop + frame.clientH * 0.4;
				for (let i = 0; i < markers.length; i++) {
					const pos = frame.positions.get(markers[i].key);
					if (typeof pos !== "number") continue;
					if (pos <= threshold) activeKey = markers[i].key;
					else break;
				}
				if (activeKey === null) activeKey = markers[0].key;

				const children = [];
				children.push(React.createElement("div", { key: "track", className: "dyn-turnrail-track" }));
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
						let tipStyle = null;
						if (pct < 0.15) tipStyle = { top: "2px", transform: "none" };
						else if (pct > 0.85) tipStyle = { top: "auto", bottom: "2px", transform: "none" };
						itemChildren.push(React.createElement("div", { className: "dyn-turnrail-tip", style: tipStyle, "aria-hidden": true }, m.preview !== "" ? m.preview : ("第 " + m.turn + " 轮")));
					}
					children.push(React.createElement("button", {
						key: m.key,
						type: "button",
						className: "dyn-turnrail-item" + (isActive ? " dyn-turnrail-active" : ""),
						style: { top: (pct * railH).toFixed(1) + "px" },
						"aria-label": "跳转到第 " + m.turn + " 轮",
						title: m.preview !== "" ? m.preview : ("第 " + m.turn + " 轮"),
						onClick: () => { jump(m.key); },
						onMouseEnter: () => { setHoverKey(m.key); },
						onMouseLeave: () => { setHoverKey(null); },
					}, itemChildren));
				}

				return React.createElement("div", {
					className: "dyn-turnrail",
					role: "navigation",
					"aria-label": "会话轮次导航",
					style: { position: "fixed", top: top + "px", right: right + "px", height: railH + "px", pointerEvents: "auto" },
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
