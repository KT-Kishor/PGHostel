sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (BaseController, JSONModel, Fragment) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Policies", {

        /* ------------------------------------------------------------
         *  Lifecycle
         * ------------------------------------------------------------ */
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RoutePolicies").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("RoutePoliciesTab").attachMatched(this._onRouteMatched, this);

            // Routed views stay alive in the NavContainer, so onExit does not
            // run when leaving this page. The app title is therefore put back
            // when the Hostel route is matched again.
            oRouter.getRoute("RouteHostel").attachMatched(function () {
                this._restoreDefaultTitle();
            }, this);

            // Kept so the page title can be reset when leaving the page.
            this._sDefaultTitle = document.title;
            this._sPendingPolicyId = "terms";

            // On a phone the index starts collapsed, so the reader lands on the
            // document and opens the list from its header. This runs before the
            // view's first render, so the collapsed state is what paints instead
            // of the list appearing and then animating shut. The property is set
            // directly because setExpanded() would animate, and the panel has no
            // DOM yet to animate.
            if (this._isSingleColumnLayout()) {
                var oTocPanel = this.byId("tocPanel");
                if (oTocPanel) {
                    this._bTocCollapsedByDefault = true;
                    oTocPanel.setProperty("expanded", false, true);
                }
            }

            // The language is chosen on another page, so it is applied before
            // anything is rendered: the first policy must already come from the
            // selected bundle.
            this._applySelectedLanguage();

            var oModel = new JSONModel();
            oModel.loadData(
                sap.ui.require.toUrl("sap/ui/com/project1/model/policies.json")
            );
            this.getView().setModel(oModel, "policies");

            // The language selector of the quick links footer binds to this
            // model, so it opens on the language that is already stored.
            this.getView().setModel(new JSONModel({
                key: localStorage.getItem("selectedLanguage") || "en"
            }), "langageModel");

            oModel.attachRequestCompleted(function () {
                // The file holds i18n keys, not text, so the key-based source is
                // kept aside and the displayed copy is resolved from it, which
                // lets the policy be translated again after a language change.
                this._aPoliciesSource = oModel.getProperty("/policies") || [];
                this._localizePolicies();
                this._renderPolicy(this._sPendingPolicyId);
            }.bind(this));

            // Re-arm the scroll-spy every time the policy HTML is rendered,
            // otherwise it keeps observing the headings of the previous policy.
            var oHtml = this.byId("docHtml");
            if (oHtml) {
                oHtml.attachAfterRendering(this._setupScrollSpy, this);
            }
        },

        onExit: function () {
            this._teardownScrollSpy();
            this._restoreDefaultTitle();
        },

        /**
         * A policy name is used as the page title while this page is open, so
         * the app title is put back once the page is left or destroyed.
         */
        _restoreDefaultTitle: function () {
            if (this._sDefaultTitle) {
                document.title = this._sDefaultTitle;
            }
        },

        /* ------------------------------------------------------------
         *  Routing
         * ------------------------------------------------------------ */
        _onRouteMatched: function (oEvent) {
            var sId = oEvent.getParameter("arguments").policyId || "terms";
            this._sPendingPolicyId = sId;

            // Routed views stay alive in the NavContainer, so this page does not
            // run onInit again when it is reopened. The language may have been
            // changed on another page in the meantime, so it is picked up here.
            var bLanguageChanged = this._applySelectedLanguage();

            // The language may have been changed on another page, so the
            // footer selector is put back on the stored value as well.
            const sLocale = localStorage.getItem("selectedLanguage") || "en";
            sap.ui.getCore().getConfiguration().setLanguage(sLocale);
            const oLanguageModel = new sap.ui.model.json.JSONModel({
                key: sLocale
            });

            this.getView().setModel(oLanguageModel, "langageModel");
            // The JSON bundle is still loading on the very first match; the
            // policy is rendered once the request completes.
            if (!this._aPoliciesSource) {
                return;
            }

            if (bLanguageChanged || !this._bPoliciesLocalized) {
                this._localizePolicies();
            }

            this._renderPolicy(sId);
        },

        _navToPolicy: function (sId) {
            if (sId) {
                this.getRouter().navTo("RoutePoliciesTab", { policyId: sId });
            }
        },
        /**
         * The language is selected on the account or footer menu and remembered
         * in local storage. The core language is switched to it and the view's
         * resource model is refreshed, so the tab labels, the headings and the
         * policy body all follow the selection. The caller is told whether the
         * language actually changed, because only then the policy text has to
         * be translated again.
         */
        _applySelectedLanguage: function () {
            var sLocale = localStorage.getItem("selectedLanguage") || "en";
            var bChanged = sLocale !== this._sLocale;
            this._sLocale = sLocale;

            sap.ui.getCore().getConfiguration().setLanguage(sLocale);

            // Refresh the i18n resource bundle. A resource model replaces its
            // bundle when the language changes, so the bundle is read from the
            // model again instead of keeping the one cached for the previous
            // language.
            var oI18nModel = this._getI18nModel();
            if (oI18nModel) {
                oI18nModel.refresh(true);
                this.i18nModel = oI18nModel.getResourceBundle();
            }

            return bChanged;
        },

        /**
         * The i18n resource model, looked up on the view first.
         *
         * On init the view is still being created and the component's models are
         * only propagated to it once it is placed, so the view has none of them
         * yet: the component model is used as a fallback there. Both are the
         * same manifest model instance, so either one can be refreshed.
         */
        _getI18nModel: function () {
            var oView = this.getView();
            var oViewModel = oView && oView.getModel("i18n");
            if (oViewModel) {
                return oViewModel;
            }

            var oComponent = this.getOwnerComponent();
            return oComponent ? oComponent.getModel("i18n") : null;
        },

        /**
         * The resource bundle for the current language, or null while no i18n
         * model can be reached yet.
         */
        _getI18nBundle: function () {
            if (this.i18nModel) {
                return this.i18nModel;
            }

            var oI18nModel = this._getI18nModel();
            return oI18nModel ? oI18nModel.getResourceBundle() : null;
        },

        /**
         * policies.json stores i18n keys instead of literal text, so every
         * phrase — the tab labels, the headings and the policy body HTML — is
         * translated in the resource bundles. The key-based source stays
         * untouched and a resolved copy is written to the model, so the view
         * bindings and the HTML builder keep working with plain text and the
         * same data can be translated again for another language.
         */
        _localizePolicies: function () {
            var oModel = this.getView().getModel("policies");
            var oBundle = this._getI18nBundle();
            if (!oModel || !oBundle) return;

            var fnText = function (sKey) {
                return typeof sKey === "string" && sKey ? oBundle.getText(sKey) : sKey;
            };

            var aPolicies = (this._aPoliciesSource || []).map(function (oPolicy) {
                return Object.assign({}, oPolicy, {
                    tab:      fnText(oPolicy.tab),
                    title:    fnText(oPolicy.title),
                    subtitle: fnText(oPolicy.subtitle),
                    updated:  fnText(oPolicy.updated),
                    keyPoints: (oPolicy.keyPoints || []).map(fnText),
                    sections: (oPolicy.sections || []).map(function (oSection) {
                        return Object.assign({}, oSection, {
                            title: fnText(oSection.title),
                            html:  fnText(oSection.html)
                        });
                    })
                });
            });

            oModel.setProperty("/policies", aPolicies);
            this._bPoliciesLocalized = true;
        },

        /* ------------------------------------------------------------
         *  Rendering
         * ------------------------------------------------------------ */
        _renderPolicy: function (sId) {
            var oModel = this.getView().getModel("policies");
            var aPolicies = oModel.getProperty("/policies") || [];
            if (!aPolicies.length) return;

            var iIdx = aPolicies.findIndex(function (p) { return p.id === sId; });
            if (iIdx < 0) iIdx = 0;

            var oPolicy   = aPolicies[iIdx];
            var aSections = (oPolicy.sections || []).map(function (s, i) {
                return Object.assign({}, s, { number: i + 1 });
            });

            // Build the policy HTML body once, then hand it to the HTML control
            oModel.setProperty("/currentHtml",     this._buildHtml(aSections, oPolicy));
            oModel.setProperty("/currentId",       oPolicy.id);
            oModel.setProperty("/currentTab",      oPolicy.tab);
            oModel.setProperty("/currentTitle",    oPolicy.title);
            oModel.setProperty("/currentSubtitle", oPolicy.subtitle);
            oModel.setProperty("/currentUpdated",  oPolicy.updated);
            oModel.setProperty("/currentSections", aSections);

            var oPrev = aPolicies[iIdx - 1];
            var oNext = aPolicies[iIdx + 1];
            oModel.setProperty("/prevId",  oPrev ? oPrev.id  : "");
            oModel.setProperty("/prevTab", oPrev ? "\u2039 " + oPrev.tab : "");
            oModel.setProperty("/nextId",  oNext ? oNext.id  : "");
            oModel.setProperty("/nextTab", oNext ? oNext.tab + " \u203A" : "");

            // Browsers derive the suggested PDF/file name for printing from the
            // page title, so the tab label is used as the title while a policy
            // is open. That keeps the name correct whether printing is started
            // from the Print button or from the browser menu (Ctrl+P).
            document.title = oPolicy.tab;

            // A new policy starts a new index list, so a selection pinned on the
            // previous policy is released before the highlight is resolved.
            this._bTocSelectionPinned = false;

            this._scrollToTop();

            // The tab strip and the table of contents are rebuilt by their own
            // bindings, so highlight them once that rendering pass is done.
            var that = this;
            setTimeout(function () {
                that._highlightActiveTab(oPolicy.id);
                that._fitToc();
                that._updateActiveToc();
            }, 0);
        },

        _buildHtml: function (aSections, oPolicy) {
            var s = "";
            var oBundle = this._getI18nBundle();

            // Key points block
            var aKp = oPolicy.keyPoints || [];
            if (aKp.length) {
                s += "<div class='glance'><h2>" +
                     (oBundle ? oBundle.getText("policyKeyPoints") : "") +
                     "</h2><ul>";
                aKp.forEach(function (kp) { s += "<li>" + kp + "</li>"; });
                s += "</ul></div>";
            }

            // Numbered sections
            aSections.forEach(function (sec) {
                s += "<section>";
                s += "<h2 id='" + sec.id + "'>" +
                     "<span class='n'>" + sec.number + ".</span>" +
                     sec.title +
                     "</h2>";
                s += sec.html;
                s += "</section>";
            });

            // One single root node: sap.ui.core.HTML replaces a single root on
            // content change, while multiple roots leave stale DOM behind.
            return "<div class='policyDoc'>" + s + "</div>";
        },

        _highlightActiveTab: function (sId) {
            var oTabs = this.byId("policyTabs");
            if (!oTabs) return;

            oTabs.getItems().forEach(function (oBtn) {
                // The current tab keeps the filled unified button look, the
                // others are recessed to a link appearance by the stylesheet.
                oBtn.toggleStyleClass("tabActive", oBtn.data("policyId") === sId);
            });
        },

        _scrollToTop: function () {
            var oScroller = this._getScrollContainer();
            if (oScroller) {
                oScroller.scrollTop = 0;
            }
        },

        /* ------------------------------------------------------------
         *  Scroll-spy
         * ------------------------------------------------------------ */
        _getScrollContainer: function () {
            var oPage = this.byId("page");
            if (!oPage) return null;

            var oPageDom = oPage.getDomRef();
            if (!oPageDom) return null;

            // Depending on the UI5 version the scrollable node is either the
            // "scroll" sub-element or the page's own <section> element.
            return oPage.getDomRef("scroll") ||
                oPageDom.querySelector("section.sapMPageEnableScrolling") ||
                oPageDom.querySelector("section");
        },

        _teardownScrollSpy: function () {
            var oScroller = this._oScroller;

            if (oScroller && this._fnScrollSpy) {
                oScroller.removeEventListener("scroll", this._fnScrollSpy);
            }
            if (this._fnFitToc) {
                window.removeEventListener("resize", this._fnFitToc);
                this._fnFitToc = null;
            }
            if (this._iSpySettleTimer) {
                window.clearTimeout(this._iSpySettleTimer);
                this._iSpySettleTimer = null;
            }

            this._oScroller = null;
            this._fnScrollSpy = null;
        },

        _setupScrollSpy: function () {
            this._teardownScrollSpy();

            var oScroller = this._getScrollContainer();
            if (!oScroller) return;

            this._oScroller = oScroller;
            // The available space changes while the page scrolls (the banner
            // scrolls away, the sticky footer stays), so the panel is refitted
            // on every scroll before the active entry is resolved. A trailing
            // pass runs once scrolling settles: a smooth scroll (an index tap)
            // can end after the last scroll event, which would otherwise leave
            // the highlight one entry behind.
            this._fnScrollSpy = function () {
                this._fitToc();
                this._updateActiveToc();

                if (this._iSpySettleTimer) {
                    window.clearTimeout(this._iSpySettleTimer);
                }
                this._iSpySettleTimer = window.setTimeout(function () {
                    this._iSpySettleTimer = null;
                    this._fitToc();
                    this._updateActiveToc();
                }.bind(this), 160);
            }.bind(this);
            oScroller.addEventListener("scroll", this._fnScrollSpy, { passive: true });

            // A resize can change the banner height or the page width, and the
            // active entry is refreshed because the panel height changed.
            this._fnFitToc = function () {
                this._fitToc();
                this._updateActiveToc();
            }.bind(this);
            window.addEventListener("resize", this._fnFitToc);

            this._allowTouchScrollOverToc();

            // Fit the index panel and highlight the entry matching the current
            // position, so a freshly rendered policy does not start without an
            // active entry.
            this._fitToc();
            this._updateActiveToc();
        },

        /**
         * Makes the index work with touch on small screens.
         *
         * sap.m attaches a handler to every Link that calls preventDefault() on
         * touchstart, which stops the browser from starting a scroll gesture, so
         * swiping over the index did not scroll the page. The gesture is
         * therefore stopped in the capture phase before it reaches sap.m;
         * nothing is preventDefault()ed, so native scrolling still works.
         *
         * Because the gesture no longer reaches the Link, its press is not
         * fired, so a tap is handled here instead: the touch is treated as a tap
         * only when the finger barely moved, so a swipe is never mistaken for a
         * tap.
         */
        _allowTouchScrollOverToc: function () {
            var oView = this.getView();
            var oViewDom = oView && oView.getDomRef();

            if (!oViewDom || oViewDom.getAttribute("data-toc-touch") === "true") {
                return;
            }
            oViewDom.setAttribute("data-toc-touch", "true");

            var iStartX = 0;
            var iStartY = 0;
            var oStartTarget = null;

            var fnInToc = function (oEvent) {
                var oList = this.byId("tocList");
                var oListDom = oList && oList.getDomRef();

                return !!(oListDom && oListDom.contains(oEvent.target));
            }.bind(this);

            ["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function (sType) {
                oViewDom.addEventListener(sType, function (oEvent) {
                    if (!fnInToc(oEvent)) {
                        return;
                    }

                    if (sType === "touchstart") {
                        var oTouch = oEvent.touches && oEvent.touches[0];
                        iStartX = oTouch ? oTouch.clientX : 0;
                        iStartY = oTouch ? oTouch.clientY : 0;
                        oStartTarget = oEvent.target;
                    }

                    // Stops the gesture before sap.m sees it. The Link press is
                    // handled separately below.
                    oEvent.stopPropagation();
                }, { capture: true, passive: true });
            });

            oViewDom.addEventListener("touchend", function (oEvent) {
                if (!oStartTarget) {
                    return;
                }

                var oChanged = oEvent.changedTouches && oEvent.changedTouches[0];
                var oTarget = oStartTarget;
                oStartTarget = null;

                if (!oChanged) {
                    return;
                }

                // A finger that travelled is a swipe, not a tap.
                if (Math.abs(oChanged.clientX - iStartX) > 10 ||
                    Math.abs(oChanged.clientY - iStartY) > 10) {
                    return;
                }

                var oLink = oTarget.closest ? oTarget.closest(".tocLink") : null;
                if (oLink) {
                    this._jumpToSection(oLink.getAttribute("data-target"));
                }
            }.bind(this), { capture: true, passive: true });
        },

        /**
         * Highlights the given section and scrolls the document to it, keeping
         * the highlight on it while the smooth scroll is still running.
         */
        _jumpToSection: function (sTarget) {
            if (!sTarget) return;

            // Mark the entry straight away so it shows the active pill instead of
            // waiting for the scroll-spy to catch up.
            this._setActiveToc(sTarget);

            // In the single-column layout the index sits above the document and
            // scrolls out of view as soon as the jump starts, so the tapped entry
            // is pinned: returning to the index must still show the section the
            // reader chose. On desktop the list stays on screen, where following
            // the reading position is the more useful behaviour.
            if (this._isSingleColumnLayout()) {
                this._bTocSelectionPinned = true;
            }

            var oEl = document.getElementById(sTarget);
            if (oEl) {
                this._iTocJumpUntil = Date.now() + 900;
                oEl.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        },

        _isSingleColumnLayout: function () {
            return window.matchMedia("(max-width: 900px)").matches;
        },

        /**
         * Keeps the index panel within the space between the header/banner and
         * the sticky footer. The panel scrolls internally when the list is
         * longer than that space, so no entry ends up hidden behind the footer.
         */
        _fitToc: function () {
            var bSingleColumn = window.matchMedia("(max-width: 900px)").matches;

            // The index is collapsible on small screens only, where it sits in
            // the page flow. On desktop it stays permanently expanded, so the
            // Panel is made non-expandable there: that removes both the toggle
            // behaviour and the space the arrow would occupy.
            //
            // `expanded` is not forced back to true on desktop: a non-expandable
            // Panel always shows its content (the renderer only marks the content
            // as an expandable part while the Panel is expandable), and setting it
            // would animate a Panel that is already non-expandable, which leaves
            // the animating class behind.
            var oPanel = this.byId("tocPanel");
            if (oPanel && oPanel.getExpandable() !== bSingleColumn) {
                oPanel.setExpandable(bSingleColumn);

                // Changing expandability re-renders the Panel and replaces its
                // content DOM, which would discard the height applied below, so
                // the fit is repeated once that render has happened.
                window.setTimeout(this._fitToc.bind(this), 0);
                return;
            }

            // Covers the case where the page was opened at a desktop width and
            // the viewport is later narrowed: the index then adopts its
            // single-column default and starts collapsed. Applied once, so
            // scrolling cannot undo an expand the reader has made.
            if (oPanel && bSingleColumn && !this._bTocCollapsedByDefault) {
                this._bTocCollapsedByDefault = true;

                if (oPanel.getExpanded()) {
                    oPanel.setExpanded(false);
                    window.setTimeout(this._fitToc.bind(this), 0);
                    return;
                }
            }

            var oBody = this.byId("tocBody");
            if (!oBody) return;

            var oBodyDom = oBody.getDomRef();
            if (!oBodyDom) return;

            // Single-column layout: the index is in the page flow and expands
            // fully, so the height cap does not apply.
            if (bSingleColumn) {
                if (oBodyDom.style.maxHeight) {
                    oBodyDom.style.maxHeight = "";
                }
                return;
            }

            var oScroller = this._getScrollContainer();
            var oCol = this.byId("tocCol");
            var oColDom = oCol && oCol.getDomRef();
            var oPanelDom = oPanel && oPanel.getDomRef();
            if (!oScroller || !oColDom || !oPanelDom) return;

            var oFooter = document.querySelector(".policyPage .policyFooter");
            var iFooterTop = oFooter ? oFooter.getBoundingClientRect().top
                : window.innerHeight;

            // The panel fills the space left above the sticky footer, so it grows
            // as the banner scrolls away instead of leaving a dead gap.
            //
            // The reference top is clamped to the sticky offset: while the panel
            // cannot fit (near the end of the page it is pushed up by its
            // container), using the live position would feed back into the
            // height and make the panel grow without bound.
            // Must match the sticky `top` of .tocCol in style.css.
            var iStickyTop = 8;
            var iPanelTop = oPanelDom.getBoundingClientRect().top;
            var iTop = Math.max(iPanelTop,
                oScroller.getBoundingClientRect().top + iStickyTop);

            var iChrome = oBodyDom.getBoundingClientRect().top - iPanelTop;
            var iGap = 8;

            var iByFooter = iFooterTop - iTop - iChrome - iGap;

            // A sticky element cannot be pinned past the end of its container, so
            // the height is also bounded by where that container ends.
            var iByContainer = oColDom.parentElement
                ? oColDom.parentElement.getBoundingClientRect().bottom - iTop - iChrome
                : iByFooter;

            var iHeight = Math.max(180, Math.min(iByFooter, iByContainer));

            // Guarded so a scroll does not trigger needless layout work.
            if (Math.abs(oBodyDom.clientHeight - iHeight) > 1) {
                oBodyDom.style.maxHeight = iHeight + "px";
            }
        },

        /**
         * Marks the last heading that has already reached the top of the
         * reading area. Positions are measured against the scroll container,
         * so the value matches the offset a TOC jump scrolls a heading to
         * (the `scroll-margin-top` of `.docHtml h2`).
         */
        _updateActiveToc: function () {
            // A tapped entry is pinned in the single-column layout (see
            // _jumpToSection), so the scroll-spy must not walk the highlight away
            // from the reader's choice while the list is off screen. Desktop
            // keeps following the reading position, where the list stays visible.
            if (this._bTocSelectionPinned) {
                if (this._isSingleColumnLayout()) {
                    return;
                }
                this._bTocSelectionPinned = false;
            }

            var oWrap = this.byId("docHtmlWrap");
            if (!oWrap) return;

            var oDom = oWrap.getDomRef();
            if (!oDom) return;

            var aHeads = Array.prototype.slice.call(oDom.querySelectorAll("section > h2"));
            if (!aHeads.length) return;

            // While an index entry is being scrolled to, the clicked entry is
            // kept highlighted; the final settle pass resolves it from geometry.
            if (this._iTocJumpUntil && Date.now() < this._iTocJumpUntil) {
                return;
            }
            this._iTocJumpUntil = 0;

            var oScroller = this._getScrollContainer();
            var iTop = oScroller ? oScroller.getBoundingClientRect().top : 0;
            var iThreshold = 80;
            var sActive = aHeads[0].id;

            aHeads.forEach(function (oHead) {
                if (oHead.getBoundingClientRect().top - iTop <= iThreshold) {
                    sActive = oHead.id;
                }
            });

            // The last sections can never reach the top of the reading area,
            // because the document stops scrolling first. At the very bottom,
            // take the last heading that is on screen instead.
            if (oScroller) {
                var bScrollable = oScroller.scrollHeight > oScroller.clientHeight + 4;
                var bAtBottom = oScroller.scrollTop + oScroller.clientHeight >=
                    oScroller.scrollHeight - 4;

                if (bScrollable && bAtBottom) {
                    aHeads.forEach(function (oHead) {
                        if (oHead.getBoundingClientRect().top - iTop < oScroller.clientHeight) {
                            sActive = oHead.id;
                        }
                    });
                }
            }

            this._setActiveToc(sActive);
        },

        _setActiveToc: function (sId) {
            var oList = this.byId("tocList");
            if (!oList) return;
            var oDom = oList.getDomRef();
            if (!oDom) return;

            var aLinks = oDom.querySelectorAll(".tocLink");
            var oActive = null;

            Array.prototype.forEach.call(aLinks, function (a) {
                var sTarget = a.getAttribute("data-target") || a.dataset.target;
                var bActive = sTarget === sId;

                // Inactive entries stay white (_link), the current one switches
                // to the shared teal link style on a white pill.
                a.classList.toggle("active", bActive);
                a.classList.toggle("tealTextLink", bActive);
                a.classList.toggle("_link", !bActive);

                if (bActive) oActive = a;
            });

            this._revealTocEntry(oActive);
        },

        /**
         * Scrolls the index panel itself so the current entry sits in the
         * middle of the visible list. Centring keeps the entry in view at both
         * ends of the list without any edge padding logic, and only the panel
         * is scrolled, so the reading position is left untouched.
         */
        _revealTocEntry: function (oLink) {
            var oBody = this.byId("tocBody");
            if (!oBody || !oLink) return;

            var oBodyDom = oBody.getDomRef();
            if (!oBodyDom) return;

            // While the whole list fits, there is nothing to scroll.
            if (oBodyDom.scrollHeight <= oBodyDom.clientHeight + 1) {
                if (oBodyDom.scrollTop !== 0) oBodyDom.scrollTop = 0;
                return;
            }

            var iPanelTop = oBodyDom.getBoundingClientRect().top;
            var iLinkTop = oLink.getBoundingClientRect().top - iPanelTop +
                oBodyDom.scrollTop;

            // Centre the entry, clamped to the list's own start and end.
            var iTarget = iLinkTop - (oBodyDom.clientHeight - oLink.offsetHeight) / 2;
            var iMax = oBodyDom.scrollHeight - oBodyDom.clientHeight;

            oBodyDom.scrollTop = Math.max(0, Math.min(iTarget, iMax));
        },

        /* ------------------------------------------------------------
         *  Event handlers
         * ------------------------------------------------------------ */
        onTabPress: function (oEvent) {
            this._navToPolicy(oEvent.getSource().data("policyId"));
        },

        onTocPress: function (oEvent) {
            // Used for mouse/pointer activation. Touch taps are handled in
            // _allowTouchScrollOverToc, because the gesture is stopped there
            // before it can reach the Link and fire this press.
            this._jumpToSection(oEvent.getSource().data("target"));
        },

        onPrev: function () {
            this._navToPolicy(this.getView().getModel("policies").getProperty("/prevId"));
        },

        onNext: function () {
            this._navToPolicy(this.getView().getModel("policies").getProperty("/nextId"));
        },

        onPrint: function () {
            // document.title already carries the open tab's name (set when the
            // policy is rendered), which browsers use as the suggested file name.
            window.print();
        },

        onHome: function () {
            // Logo and home button both return to the Hostel page. Navigating to
            // the route directly also works when the page was opened by a deep
            // link, where there is no history entry to go back to.
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        },

        /**
         * Back button of the shared BookingHeader fragment. The Policies page is
         * reached from the Hostel page footer, so back returns there.
         */
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        },

        /* ------------------------------------------------------------
         *  Breadcrumb handlers
         * ------------------------------------------------------------ */
        onCrumbHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        },

        onCrumbPolicies: function () {
            // The generic Policies step opens the first policy of the list.
            this.getOwnerComponent().getRouter().navTo("RoutePolicies");
        },

        /* ------------------------------------------------------------
         *  Footer fragment handlers
         * ------------------------------------------------------------ */
        onPoliciesPress: function () {
            this.getRouter().navTo("RoutePolicies");
        },

        /**
         * Opens the policy whose id is carried by the pressed control, so one
         * handler serves every policy link in the footer.
         */
        onPolicyLinkPress: function (oEvent) {
            var sPolicyId = oEvent.getSource().data("policyId");

            if (sPolicyId) {
                this.getRouter().navTo("RoutePoliciesTab", { policyId: sPolicyId });
            }
        },

        onUsermanualPress: function () {
            this.getRouter().navTo("RouteUserManual", {
                flag: "hostel",
                branchId: "branchid"
            });
        },

        onPrivacyPolicyPress: function () {
            var oView = this.getView();

            if (!this._pTermsDialog) {
                this._pTermsDialog = Fragment.load({
                    id: oView.getId(),
                    name: "sap.ui.com.project1.fragment.TermsandCondition",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);

                    var oHtml = Fragment.byId(oView.getId(), "termsPdfFrame");

                    if (!oHtml) {
                        throw new Error("termsPdfFrame was not found.");
                    }

                    oHtml.addEventDelegate({
                        onAfterRendering: function () {
                            var oIframe = oHtml.getDomRef().querySelector("iframe");

                            if (!oIframe) {
                                return;
                            }

                            oIframe.src = sap.ui.require.toUrl(
                                "sap/ui/com/project1/Documents/TermsAndConditions.pdf"
                            );
                        }
                    });

                    return oDialog;
                }.bind(this));
            }

            this._pTermsDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onTermsDialogClose: function () {
            var oDialog = Fragment.byId(this.getView().getId(), "termsDialog");

            if (oDialog) {
                oDialog.close();
            }
        },

        onFooterMenuPress: function (oEvent) {
            if (!this._oFooterMenu) {
                this._oFooterMenu = new sap.m.Menu({
                    items: [
                        new sap.m.MenuItem({
                            text: "User Manual",
                            icon: "sap-icon://visits",
                            press: this.onUsermanualPress.bind(this)
                        }),
                        new sap.m.MenuItem({
                            text: "Policies",
                            icon: "sap-icon://shield",
                            press: this.onPoliciesPress.bind(this)
                        })
                    ].concat(this._policyMenuItems())
                });

                this.getView().addDependent(this._oFooterMenu);
            }

            this._oFooterMenu.openBy(oEvent.getSource());
        },

        /**
         * The footer menu entries for the individual policies. Each item carries
         * its policy id in custom data, so the shared onPolicyLinkPress opens the
         * matching tab. Labels come from the same i18n keys the desktop links use.
         */
        _policyMenuItems: function () {
            var oBundle = this._getI18nBundle();
            var aPolicies = [
                { id: "terms", key: "policyLinkTerms", icon: "sap-icon://document-text" },
                { id: "privacy", key: "policyLinkPrivacy", icon: "sap-icon://locked" },
                { id: "refund", key: "policyLinkRefund", icon: "sap-icon://undo" },
                { id: "vendor", key: "policyLinkVendor", icon: "sap-icon://home" },
                { id: "grievance", key: "policyLinkGrievance", icon: "sap-icon://comment" }
            ];

            return aPolicies.map(function (oPolicy) {
                var oItem = new sap.m.MenuItem({
                    text: oBundle ? oBundle.getText(oPolicy.key) : oPolicy.key,
                    icon: oPolicy.icon,
                    press: this.onPolicyLinkPress.bind(this)
                });

                oItem.addCustomData(new sap.ui.core.CustomData({
                    key: "policyId",
                    value: oPolicy.id
                }));

                return oItem;
            }, this);
        },

        onAdminSIGNUP: function () {
            // Vendor registration dialog lives on the hostel page.
            this.getRouter().navTo("RouteHostel");
        },

        /**
         * The quick links footer repeats the Hostel page tabs. That page reads
         * the tab it should open from session storage when its route is
         * matched, so the target tab is queued here before navigating to it.
         */
        _navToHostelTab: function (sTabKey) {
            sessionStorage.setItem("homePageReturnTab", sTabKey);
            this.getRouter().navTo("RouteHostel");
        },

        onfooterhometabselect: function () {
            this._navToHostelTab("idHome");
        },

        onfootertabselect: function () {
            this._navToHostelTab("idRooms");
        },

        onfootercontacttabselect: function () {
            this._navToHostelTab("idContact");
        },

        onBuyHealthInsurance: function () {
            this.getRouter().navTo("RouteHealthinsurance", { sPath: "Health" });
        },

        onBuyTravelInsurance: function () {
            this.getRouter().navTo("RouteHealthinsurance", { sPath: "Travel" });
        },

        /**
         * Language selector of the quick links footer. The choice is remembered,
         * applied to the resource bundle, and the policy that is open is
         * translated again so the whole page follows the new language.
         */
        onLanguagePress: function (oEvent) {

            var sLocale = oEvent.getSource().getSelectedKey();
            var oView = this.getView();

            // Save selected language
            localStorage.setItem("selectedLanguage", sLocale);

            // Update SAPUI5 language configuration
            sap.ui.getCore().getConfiguration().setLanguage(sLocale);

            // Create the resource model for the selected language
            var oResourceModel = new sap.ui.model.resource.ResourceModel({
                bundleName: "sap.ui.com.project1.i18n.i18n",
                bundleLocale: sLocale
            });

            // Set the updated i18n model
            oView.setModel(oResourceModel, "i18n");

            // Update the resource bundle used in controller methods
            this.i18nModel = oResourceModel.getResourceBundle();

            // Refresh UI bindings

            if (this._aPoliciesSource) {
                this._localizePolicies();
                this._renderPolicy(this._sPendingPolicyId);
            }
        },

        /**
         * The index lives in an expandable Panel, which toggles itself and its
         * arrow. Refit on expand so the panel height matches the available
         * space again.
         */
        onTocToggle: function () {
            var that = this;

            window.setTimeout(function () {
                that._fitToc();
                that._updateActiveToc();
            }, 0);
        },
          onfooterhometabselect: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo("RouteHostel");
},
       onfootertabselect: function () {
            const sTabKey = "idRooms"
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
            sessionStorage.setItem("homePageReturnTab", sTabKey);
        },
  onfootercontacttabselect: function () {
            const sTabKey = "idContact"
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
            sessionStorage.setItem("homePageReturnTab", sTabKey);
        },
    });
});
