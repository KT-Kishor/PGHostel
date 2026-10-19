sap.ui.define([
	 "./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter",

], function (BaseController, JSONModel, Filter, FilterOperator, Dialog, Button,  MessageToast, Fragment, Formatter) {
	"use strict";

	return BaseController.extend("sap.ui.com.project1.controller.UserManual", {
        Formatter: Formatter,

		onInit: function () {
             this.getOwnerComponent().getRouter().getRoute("RouteUserManual").attachMatched(this._onRouteMatched, this);

             // On a phone the index starts collapsed so the reader lands on the
             // cards and opens the list from its header. This runs before the
             // view's first render, so the collapsed state is what paints. The
             // property is set directly because setExpanded() would animate a
             // panel that has no DOM yet.
             if (this._isSingleColumnLayout()) {
                 var oPanel = this.byId("umTocPanel");
                 if (oPanel) {
                     this._bIndexCollapsedByDefault = true;
                     oPanel.setProperty("expanded", false, true);
                 }
             }
		},

        /**
         * The scroll-spy needs the page DOM, so it is armed once the view has
         * rendered as well as when the topics arrive. Whichever happens second
         * leaves a working spy, because setting it up tears the previous one
         * down first.
         */
        onAfterRendering: function () {
            if (this._bIndexReady) {
                this._setupScrollSpy();
            }
        },
_onRouteMatched: async function  (oEvent) {
    
  const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
              const sRole = oLoginModel.getProperty("/Role");

               var oArgs = oEvent.getParameter("arguments");

    // Get values from route
    this._sFlag = oArgs.flag;
    this._sBranchId = oArgs.branchId;

    this._applyFilters();

             var oManualModel = new JSONModel();

            // The index lists the topics that are on screen, so it can only be
            // built once they are loaded. The handler is attached before the
            // model is handed to the view, so a cached response cannot arrive
            // before it is listening.
            oManualModel.attachRequestCompleted(function () {
                this._buildIndex();
                this._syncIndexState();

                // The cards are rendered by their own bindings after this
                // callback, so the scroll-spy is armed once that pass is done.
                window.setTimeout(function () {
                    this._setupScrollSpy();
                }.bind(this), 0);
            }.bind(this));

            oManualModel.loadData(
                sap.ui.require.toUrl("sap/ui/com/project1/model/UserManual.json")
            );
			this.getView().setModel(oManualModel, "manual");

            // Backs the index panel. _buildIndex fills it from the topics that
            // are currently visible, so its entries always have a card to jump
            // to.
            this.getView().setModel(new JSONModel({
                items: [],
                empty: false
            }), "umIndex");

             this.getView().setModel(new JSONModel({
                title: ""
            }), "dialog");

            // The quick links footer carries the language selector, which binds
            // to this model, so it opens on the stored language.
            this.getView().setModel(new JSONModel({
                key: localStorage.getItem("selectedLanguage") || "en"
            }), "langageModel");

            // The advertisement panel under the index binds to this model, so it
            // exists (empty) before the first render and fills in once the
            // pictures arrive.
            this._setupAdvertisementModel([]);
            this._loadAdvertisements();
},
	 onBack:function(){
  if (this._sFlag === "view") {

        this.getOwnerComponent()
            .getRouter()
            .navTo("RouteViewRooms", {
                sPath: this._sBranchId
            });

    } else {

        this.getOwnerComponent()
            .getRouter()
            .navTo("RouteHostel");
    }

  },

  /**
   * Breadcrumb step of the banner. Home always leads to the hostel page, which
   * is where this page is opened from.
   */
  onCrumbHome: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo("RouteHostel");
  },

  isCardVisible: function (aExcludeRoles, sRole, bShowWhenNoRole, bMatchesSearch) {
			// The search text is the fourth part of the binding. It is undefined
			// until the index is built for the first time, and an undefined value
			// must not hide anything.
			if (bMatchesSearch === false) {
				return false;
			}
			if (!sRole) {
				return !!bShowWhenNoRole;
			}
			if (!aExcludeRoles || !aExcludeRoles.length) {
				return true;
			}
			return aExcludeRoles.indexOf(sRole) === -1;
		},

      _applyFilters: function (sSearchQuery) {
			var oManualModel = this.getView().getModel("manual");

			// Called before the topics are loaded, so there is nothing to
			// filter yet; the index is built when the request completes.
			if (!oManualModel) {
				return;
			}

			this._sSearchQuery = (sSearchQuery || "").trim();

			// The search text is resolved against the topic titles in the active
			// language and written to the model, because the cards show a
			// translated title and a binding filter cannot run a formatter. It
			// also re-fills the index, so both show the same topics.
			this._buildIndex();
			this._syncIndexState();

			// The cards and the index are re-rendered by their bindings, so the
			// highlight is refreshed once that pass is done.
			window.setTimeout(this._updateActiveToc.bind(this), 0);
		},

			onSearch: function (oEvent) {
			var sQuery = oEvent.getParameter("newValue");
			this._applyFilters(sQuery);
		},

onViewDemo: function (oEvent) {

    var oContext = oEvent.getSource().getBindingContext("manual");

    if (!oContext) {
        sap.m.MessageToast.show(this.i18nModel.getText("videoInformationNot"));
        return;
    }

    var sVideoUrl = oContext.getProperty("videoUrl");
    var sTitle = oContext.getProperty("title");

    console.log("Selected video:", sVideoUrl);

    this.getView()
        .getModel("dialog")
        .setProperty("/title", sTitle);

    if (!this._oVideoDialog) {

        Fragment.load({
            id: this.getView().getId(),
            name: "sap.ui.com.project1.fragment.NewManual",
            controller: this

        }).then(function (oDialog) {

            this._oVideoDialog = oDialog;

            this.getView().addDependent(oDialog);

            oDialog.open();

            // Wait for rendering
            setTimeout(function () {
                this._loadVideo(sVideoUrl);
            }.bind(this), 500);

        }.bind(this));

    } else {

        this._oVideoDialog.open();

        setTimeout(function () {
            this._loadVideo(sVideoUrl);
        }.bind(this), 500);
    }
},
_loadVideo: function (sVideoUrl) {

    var oHTML = Fragment.byId(
        this.getView().getId(),
        "videoFrameHtml_Manual"
    );

    if (!oHTML) {
        console.error("HTML control not found");
        return;
    }

    var oDomRef = oHTML.getDomRef();

    if (!oDomRef) {
        console.error("HTML DOM not found");
        return;
    }

    var oVideo = oDomRef.querySelector("video");
    var oSource = oDomRef.querySelector("source");

    if (!oVideo || !oSource) {
        console.error("Video/source element not found");
        return;
    }

    // Build URL
    var sFullVideoUrl = sap.ui.require.toUrl(
        "sap/ui/com/project1/" + sVideoUrl
    );

    console.log("Final video URL:", sFullVideoUrl);

    // Set source
    oSource.src = sFullVideoUrl;

    // Reload video
    oVideo.load();

    // Play
    oVideo.play()
        .then(function () {

            console.log("Video started successfully");

        })
        .catch(function (oError) {

            console.warn(
                "Video autoplay blocked:",
                oError
            );

        });
},
onCloseVideoDialog: function () {

    if (this._oVideoDialog) {
        this._oVideoDialog.close();
    }
},
onVideoDialogClose: function () {

    var oPlayer = document.getElementById(
        this.getView().getId() + "--umPlayer"
    );

    if (oPlayer) {

        oPlayer.pause();

        oPlayer.removeAttribute("src");

        oPlayer.load();
    }
},

		onDownloadGuide: function (oEvent) {

    var oButton = oEvent.getSource();

    var sFileName = oButton.data("pdfFile");

    if (!sFileName) {
        MessageToast.show(this.i18nModel.getText("pdfFileNot"));
        return;
    }

    var sPdfUrl = sap.ui.require.toUrl(
        "sap/ui/com/project1/Documents/" + sFileName
    );

    var oLink = document.createElement("a");

    oLink.href = sPdfUrl;
    oLink.download = sFileName;

    document.body.appendChild(oLink);
    oLink.click();
    document.body.removeChild(oLink);
},
    



showDescriptionLinkVisible: function (sDescription) {

    return !!sDescription && sDescription.length > 300;
},
onShowDescription: function (oEvent) {

    var oLink = oEvent.getSource();
    var oContext = oLink.getBindingContext("manual");

    var sDescription = oContext.getProperty("description");

    // Show complete description
    MessageBox.information(sDescription, {
        title: this.i18nModel.getText("Description")
    });
},
onToggleDescription: function (oEvent) {

    var oLink = oEvent.getSource();
    var oContext = oLink.getBindingContext("manual");

    var oModel = this.getView().getModel("manual");
    var sPath = oContext.getPath();

    var bExpanded = oModel.getProperty(sPath + "/expanded");

    oModel.setProperty(
        sPath + "/expanded",
        !bExpanded
    );
},

/* ------------------------------------------------------------
 *  Quick links footer
 * ------------------------------------------------------------ */

/**
 * The footer is shown on this page as well, so its links are served by the
 * handlers below: they route to the page that owns the real content instead
 * of duplicating it here.
 */
onUsermanualPress: function () {
    // The manual is already open; the route is re-entered with the arguments
    // this page was opened with so the back target stays correct.
    this.getOwnerComponent()
        .getRouter()
        .navTo("RouteUserManual", {
            flag: this._sFlag || "hostel",
            branchId: this._sBranchId || "branchid"
        });
},

onPoliciesPress: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo("RoutePolicies");
},

onPolicyLinkPress: function (oEvent) {
    var sPolicyId = oEvent.getSource().data("policyId");

    if (sPolicyId) {
        this.getOwnerComponent()
            .getRouter()
            .navTo("RoutePoliciesTab", { policyId: sPolicyId });
    }
},

onAdminSIGNUP: function () {
    // Vendor registration lives on the hostel page, in the
    // "List your property" tab.
    this._navToHostelTab("idVendor");
},

/**
 * The footer repeats the hostel page tabs. That page reads the tab it should
 * open from session storage when its route is matched, so the target tab is
 * queued here before navigating to it.
 */
_navToHostelTab: function (sTabKey) {
    sessionStorage.setItem("homePageReturnTab", sTabKey);
    this.getOwnerComponent()
        .getRouter()
        .navTo("RouteHostel");
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
    this.getOwnerComponent()
        .getRouter()
        .navTo("RouteHealthinsurance", { sPath: "Health" });
},

onBuyTravelInsurance: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo("RouteHealthinsurance", { sPath: "Travel" });
},

/**
 * Language selector of the footer. The choice is stored and applied, and the
 * cards are re-resolved because their titles come from a formatter that reads
 * the resource bundle: refreshing the manual model makes those bindings run
 * again and pick up the new language.
 */
onLanguagePress: function (oEvent) {
    var sLocale = oEvent.getSource().getSelectedKey();
    var oView = this.getView();

    localStorage.setItem("selectedLanguage", sLocale);
    sap.ui.getCore().getConfiguration().setLanguage(sLocale);

    var oResourceModel = new sap.ui.model.resource.ResourceModel({
        bundleName: "sap.ui.com.project1.i18n.i18n",
        bundleLocale: sLocale
    });

    oView.setModel(oResourceModel, "i18n");
    this.i18nModel = oResourceModel.getResourceBundle();

    var oLanguageModel = oView.getModel("langageModel");
    if (oLanguageModel) {
        oLanguageModel.setProperty("/key", sLocale);
    }

    var oManualModel = oView.getModel("manual");
    if (oManualModel) {
        oManualModel.refresh(true);
    }

    // The index entries are resolved from the same bundle, so the list is
    // rebuilt to show the titles in the new language.
    this._buildIndex();
},

/* ------------------------------------------------------------
 *  Advertisements
 *
 *  The panel under the index reuses the advertisement carousel of the booking
 *  page: the same service, the same picture transformation and the same
 *  auto-slide with pause/resume. Only the slide size differs, because this
 *  column is narrower.
 * ------------------------------------------------------------ */

_loadAdvertisements: async function () {
    try {
        const oResponse = await this.ajaxReadWithJQuery("HM_Advertisement");
        const aAdvertisements = oResponse?.data || [];

        const aCarouselItems = this._transformAdvertisementData(aAdvertisements);
        this._setupAdvertisementModel(aCarouselItems);
    } catch (oError) {
        this._setupAdvertisementModel([]);
    }
},

_transformAdvertisementData: function (aAdvertisements) {
    const aCarouselItems = [];
    const that = this;

    aAdvertisements.forEach(function (oAd) {
        // Extract photos from Photo1, Photo2, Photo3, etc.
        for (let i = 1; i <= 3; i++) {
            const sPhotoField = `Photo${i}`;
            const sNameField = `Photo${i}Name`;
            const sTypeField = `Photo${i}Type`;

            if (oAd[sPhotoField]) {
                const sImageSrc = that._prepareImageData(oAd[sPhotoField], oAd[sTypeField]);

                if (sImageSrc) {
                    aCarouselItems.push({
                        id: oAd.ID + '-' + i,
                        image: sImageSrc,
                        title: oAd[sNameField] || `Advertisement ${i}`,
                        url: oAd.URL,
                        originalAd: oAd
                    });
                }
            }
        }
    });

    return aCarouselItems;
},

_prepareImageData: function (sImageData, sImageType) {
    if (!sImageData) {
        return null;
    }

    const sCleanData = sImageData.replace(/\s/g, '');

    if (sCleanData.startsWith('data:')) {
        return sCleanData;
    }

    let sType = sImageType || 'image/png';

    if (!sType.startsWith('image/')) {
        sType = 'image/png';
    }

    return `data:${sType};base64,${sCleanData}`;
},

_setupAdvertisementModel: function (aCarouselItems) {
    if (!this.getView()) {
        return;
    }

    const oAdvertisementModel = new JSONModel({
        Advertisements: aCarouselItems,
        currentPage: 0,
        itemsPerPage: 1
    });
    this.getView().setModel(oAdvertisementModel, "AdvertisementModel");

    // The panel takes space under the index, so the index height is refitted
    // once the pictures have rendered.
    window.setTimeout(function () {
        this._fitToc();
    }.bind(this), 0);

    if (aCarouselItems.length > 1) {
        this._startAdvertisementCarouselAutoSlide();
    } else {
        // A previous visit may have left a loop running for pictures that are
        // no longer there.
        this._stopAdvertisementCarouselAutoSlide();
    }
},

_startAdvertisementCarouselAutoSlide: function () {
    const oCarousel = this.byId("AdvertisementCarousel");

    // The carousel is rendered after the first binding pass, so the start waits
    // for it. The attempts are capped so a closed page cannot keep retrying.
    if (!oCarousel || oCarousel.getPages().length <= 1) {
        this._iAdCarouselRetries = (this._iAdCarouselRetries || 0) + 1;

        if (this._iAdCarouselRetries > 40 || !this.getView()) {
            return;
        }

        setTimeout(() => this._startAdvertisementCarouselAutoSlide(), 300);
        return;
    }
    this._iAdCarouselRetries = 0;

    // The pictures are rendered by now, so the index is refitted above the
    // panel's final height.
    this._fitToc();

    this._stopAdvertisementCarouselAutoSlide();

    const fnPauseResume = () => {
        this._stopAdvertisementCarouselAutoSlide();

        // Resume after 3 seconds of inactivity
        this._iAdCarouselResumeTimer = setTimeout(() => {
            this._iAdCarouselResumeTimer = null;

            if (oCarousel && !oCarousel.bIsDestroyed && oCarousel.getPages().length > 1) {
                this._startAdvertisementCarouselAutoSlide();
            }
        }, 3000);
    };

    // Attach events and store references so they are detached on the next start
    ['touchstart', 'mousedown'].forEach(event => {
        const handler = fnPauseResume.bind(this);
        oCarousel.attachBrowserEvent(event, handler);
        this._adCarouselPauseResumeHandlers.push({
            element: oCarousel,
            event: event,
            fn: handler
        });
    });

    this._adCarouselInterval = setInterval(() => {
        if (oCarousel && !oCarousel.bIsDestroyed) {
            oCarousel.next();
        } else {
            this._stopAdvertisementCarouselAutoSlide();
        }
    }, 3000);
},

_stopAdvertisementCarouselAutoSlide: function () {
    if (this._adCarouselInterval) {
        clearInterval(this._adCarouselInterval);
        this._adCarouselInterval = null;
    }

    if (this._iAdCarouselResumeTimer) {
        clearTimeout(this._iAdCarouselResumeTimer);
        this._iAdCarouselResumeTimer = null;
    }

    if (this._adCarouselPauseResumeHandlers) {
        this._adCarouselPauseResumeHandlers.forEach(handler => {
            if (handler.element && handler.event && handler.fn) {
                handler.element.detachBrowserEvent(handler.event, handler.fn);
            }
        });
    }

    // Always a fresh array, so a first start can safely push into it.
    this._adCarouselPauseResumeHandlers = [];
},

onAdvertisementImagePress: function (oEvent) {
    const oImage = oEvent.getSource();
    const oBindingContext = oImage.getBindingContext("AdvertisementModel");
    const oBundle = this._bundle();
    const sMessage = oBundle
        ? oBundle.getText("advertisementClicked")
        : "Advertisement clicked";

    if (oBindingContext) {
        const oAdItem = oBindingContext.getObject();
        if (oAdItem && oAdItem.url) {
            // Open the URL in a new tab
            window.open(oAdItem.url, "_blank");
            return;
        }
    }

    MessageToast.show(sMessage);
},

onExit: function () {
    // Base cleanup (shared carousel timers) plus the ad loop of this page.
    BaseController.prototype.onExit.call(this);
    this._stopAdvertisementCarouselAutoSlide();
},

/* ------------------------------------------------------------
 *  Index panel
 *
 *  The panel, the styles and the behaviour are the ones used on the policy
 *  page: the list follows the reading position, an entry scrolls its card into
 *  view, and on a phone the panel collapses into the page flow. The entries are
 *  the cards that are actually on screen, so an entry always has a target.
 * ------------------------------------------------------------ */

_bundle: function () {
    if (this.i18nModel) {
        return this.i18nModel;
    }

    var oView = this.getView();
    var oModel = oView && oView.getModel("i18n");
    if (oModel) {
        this.i18nModel = oModel.getResourceBundle();
        return this.i18nModel;
    }

    return null;
},

_role: function () {
    var oLoginModel = this.getOwnerComponent().getModel("LoginModel");
    return oLoginModel ? oLoginModel.getProperty("/Role") : "";
},

/**
 * Fills the index from the topics that pass the role rule and the search, and
 * writes the search result back to the model so the cards hide and show with
 * the same rule. The list and the grid therefore never disagree.
 */
_buildIndex: function () {
    var oView = this.getView();
    var oIndexModel = oView.getModel("umIndex");
    var oManualModel = oView.getModel("manual");

    if (!oIndexModel || !oManualModel) {
        return;
    }

    var oBundle = this._bundle();
    var sRole = this._role();
    var sQuery = (this._sSearchQuery || "").toLowerCase();
    var aTopics = oManualModel.getProperty("/topics") || [];
    var aItems = [];

    aTopics.forEach(function (oTopic, i) {
        var sTitle = oBundle ? oBundle.getText(oTopic.titleKey) : oTopic.titleKey;
        var bMatches = !sQuery || sTitle.toLowerCase().indexOf(sQuery) !== -1;

        // The cards read this through their visible binding, so the search is
        // applied to the grid by the same value the index is built from.
        oManualModel.setProperty("/topics/" + i + "/matchesSearch", bMatches);

        if (this.isCardVisible(oTopic.excludeRoles, sRole, oTopic.showWhenNoRole, bMatches)) {
            aItems.push({
                target: "/topics/" + i,
                title: sTitle
            });
        }
    }, this);

    oIndexModel.setProperty("/items", aItems);
    oIndexModel.setProperty("/empty", aItems.length === 0);

    // Signals that the list content exists, so a later render may arm the spy.
    this._bIndexReady = true;
},

/**
 * The grid and its empty state follow the same list as the index, so they are
 * switched from the one place that knows how many topics are left.
 */
_syncIndexState: function () {
    var oIndexModel = this.getView().getModel("umIndex");
    var bEmpty = !oIndexModel ||
        (oIndexModel.getProperty("/items") || []).length === 0;

    var oEmptyState = this.byId("emptyState1");
    var oGrid = this.byId("cardGrid1");

    if (oEmptyState) {
        oEmptyState.setVisible(bEmpty);
    }
    if (oGrid) {
        oGrid.setVisible(!bEmpty);
    }
},

_targetOf: function (oItem) {
    var oContext = oItem && oItem.getBindingContext("manual");
    return oContext ? oContext.getPath() : null;
},

/**
 * The cards that are on screen. A card hidden by the role rule or by the
 * search renders no DOM at all, so it cannot be a jump target either.
 */
_visibleCards: function () {
    var oGrid = this.byId("cardGrid1");
    if (!oGrid) {
        return [];
    }

    return oGrid.getItems().filter(function (oItem) {
        return oItem.getVisible();
    });
},

_cardByTarget: function (sTarget) {
    var aItems = this._visibleCards();

    for (var i = 0; i < aItems.length; i++) {
        if (this._targetOf(aItems[i]) === sTarget) {
            return aItems[i];
        }
    }

    return null;
},

/**
 * The element the page scrolls in, or null when the viewport does.
 *
 * The OUTERMOST scrolling ancestor is returned, not the nearest one: nested
 * scroll ports move together, so only the outermost one keeps a fixed position on
 * screen. Measuring against an inner one would make the distance to the cards
 * constant and the highlight would never move. The nearest overflowing ancestor
 * is in fact often the content section itself, which slides up while an outer
 * container scrolls.
 */
_getScrollContainer: function () {
    var oAnchor = this.byId("cardGrid1") || this.byId("manualPage1");
    var oNode = oAnchor && oAnchor.getDomRef();
    var oOutermost = null;

    while (oNode && oNode !== document.body) {
        var sOverflowY = window.getComputedStyle(oNode).overflowY;

        if (sOverflowY === "auto" || sOverflowY === "scroll") {
            oOutermost = oNode;
        }
        oNode = oNode.parentElement;
    }

    // Nothing inside the page can scroll, so the viewport does. Positions are
    // then measured from the top of the window, which is what null means.
    return oOutermost;
},

_teardownScrollSpy: function () {
    if (this._fnScrollSpy) {
        // One listener per target, each removed with the phase it was added
        // with: a capture listener is not removed by a non-capture call.
        window.removeEventListener("scroll", this._fnScrollSpy, { capture: true });
        window.removeEventListener("scroll", this._fnScrollSpy, false);
        document.removeEventListener("scroll", this._fnScrollSpy, { capture: true });
        document.removeEventListener("scroll", this._fnScrollSpy, false);

        if (this._oScroller) {
            this._oScroller.removeEventListener("scroll", this._fnScrollSpy, false);
        }
    }
    if (this._fnFitToc) {
        window.removeEventListener("resize", this._fnFitToc);
        this._fnFitToc = null;
    }
    if (this._iSpySettleTimer) {
        window.clearTimeout(this._iSpySettleTimer);
        this._iSpySettleTimer = null;
    }
    if (this._iWatchFrame) {
        window.cancelAnimationFrame(this._iWatchFrame);
        this._iWatchFrame = 0;
    }

    this._bSpyActive = false;
    this._oScroller = null;
    this._fnScrollSpy = null;
},

_setupScrollSpy: function () {
    this._teardownScrollSpy();

    // A resize can change the page width or the rows of cards, and the active
    // entry is refreshed because the panel height changed.
    this._fnFitToc = function () {
        this._updateActiveToc();
        this._fitToc();
    }.bind(this);

    // The available space changes while the page scrolls (the index sticks
    // under the top bar, the footer comes and goes), so the panel is refitted
    // on every scroll. The highlight is resolved first, so a layout failure can
    // never leave the selection behind. The trailing pass runs once scrolling
    // settles, because a smooth scroll can end after the last scroll event and
    // would otherwise leave the highlight one entry behind.
    this._fnScrollSpy = function () {
        this._updateActiveToc();
        this._fitToc();

        if (this._iSpySettleTimer) {
            window.clearTimeout(this._iSpySettleTimer);
        }
        this._iSpySettleTimer = window.setTimeout(function () {
            this._iSpySettleTimer = null;
            this._updateActiveToc();
            this._fitToc();
        }.bind(this), 160);
    }.bind(this);

    // A scroll event does not bubble, so the capture phase is what makes it
    // observable from outside. The listener is registered on the scrolling
    // element itself (when the page has one), on the document (which every
    // element-scroll passes through) and on the window (for the viewport), so it
    // fires whichever node the page happens to scroll in.
    this._oScroller = this._getScrollContainer();
    if (this._oScroller) {
        this._oScroller.addEventListener("scroll", this._fnScrollSpy, { passive: true });
    }

    document.addEventListener("scroll", this._fnScrollSpy, { capture: true, passive: true });
    window.addEventListener("scroll", this._fnScrollSpy, { capture: true, passive: true });
    window.addEventListener("resize", this._fnFitToc);

    // Belt and braces: the scroll position is also watched per frame, so the
    // highlight follows the reading position even when the scroll happens in a
    // node whose events never reach the listeners above. The position is read
    // once per frame and the work only runs when it actually changed, so this
    // costs nothing while the page is still.
    this._startScrollWatch();

    this._allowTouchScrollOverToc();

    this._updateActiveToc();
    this._fitToc();
},

/**
 * Watches the reading position once per frame.
 *
 * The signature is taken from the card grid itself rather than from a scroll
 * port, so it changes with the scroll of ANY ancestor and the watch stays
 * correct even when the node that scrolls cannot be identified. Reading one
 * rectangle per frame is cheap, and the highlight and the panel fit only run on
 * an actual change.
 */
_startScrollWatch: function () {
    this._bSpyActive = true;

    if (this._iWatchFrame) {
        return;
    }

    var fnWatch = function () {
        if (!this._bSpyActive) {
            this._iWatchFrame = 0;
            return;
        }

        var oGrid = this.byId("cardGrid1");
        var oGridDom = oGrid && oGrid.getDomRef();
        var iGridTop = oGridDom
            ? Math.round(oGridDom.getBoundingClientRect().top)
            : 0;
        var sSignature = iGridTop + "|" + window.innerWidth + "|" +
            this._visibleCards().length;

        if (sSignature !== this._sScrollSignature) {
            this._sScrollSignature = sSignature;
            this._updateActiveToc();
            this._fitToc();
        }

        this._iWatchFrame = window.requestAnimationFrame(fnWatch);
    }.bind(this);

    this._iWatchFrame = window.requestAnimationFrame(fnWatch);
},

/**
 * Makes the index work with touch on small screens.
 *
 * sap.m attaches a handler to every Link that calls preventDefault() on
 * touchstart, which stops the browser from starting a scroll gesture, so
 * swiping over the index did not scroll the page. The gesture is therefore
 * stopped in the capture phase before it reaches sap.m; nothing is
 * preventDefault()ed, so native scrolling still works.
 *
 * Because the gesture no longer reaches the Link, its press is not fired, so a
 * tap is handled here instead: the touch is treated as a tap only when the
 * finger barely moved, so a swipe is never mistaken for a tap.
 */
_allowTouchScrollOverToc: function () {
    var oView = this.getView();
    var oViewDom = oView && oView.getDomRef();

    if (!oViewDom || oViewDom.getAttribute("data-um-toc-touch") === "true") {
        return;
    }
    oViewDom.setAttribute("data-um-toc-touch", "true");

    var iStartX = 0;
    var iStartY = 0;
    var oStartTarget = null;

    var fnInToc = function (oEvent) {
        var oList = this.byId("umTocList");
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

            // Stops the gesture before sap.m sees it. The tap is handled below.
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
            this._jumpToCard(oLink.getAttribute("data-target"));
        }
    }.bind(this), { capture: true, passive: true });
},

_isSingleColumnLayout: function () {
    return window.matchMedia("(max-width: 900px)").matches;
},

/**
 * Highlights the picked entry and scrolls its card into view, keeping the
 * highlight on it while the smooth scroll is still running.
 */
_jumpToCard: function (sTarget) {
    if (!sTarget) return;

    // Mark the entry straight away so it shows the active pill instead of
    // waiting for the scroll-spy to catch up.
    this._setActiveToc(sTarget);

    // In the single-column layout the index sits above the cards and scrolls
    // out of view as soon as the jump starts, so the picked entry is pinned:
    // returning to the index must still show the topic the reader chose. On
    // desktop the list stays on screen, where following the reading position is
    // the more useful behaviour.
    if (this._isSingleColumnLayout()) {
        this._bIndexSelectionPinned = true;
    }

    var oCard = this._cardByTarget(sTarget);
    var oDom = oCard && oCard.getDomRef();

    if (oDom) {
        this._iIndexJumpUntil = Date.now() + 900;
        oDom.scrollIntoView({ behavior: "smooth", block: "start" });
    }
},

/**
 * Re-applies the index after the Panel has re-rendered itself.
 *
 * Making the Panel expandable or non-expandable replaces its content DOM, so
 * both the height applied by the fit and the highlight on the current entry are
 * lost. The highlight is re-applied from the stored target first, so it does not
 * depend on the geometry being measurable in the same frame.
 */
_deferTocRefresh: function () {
    window.setTimeout(function () {
        this._setActiveToc(this._sActiveTarget || null);
        this._updateActiveToc();
        this._fitToc();
    }.bind(this), 0);
},

/**
 * Keeps the index panel within the space between the top bar and the footer.
 * The panel scrolls internally when the list is longer than that space, so no
 * entry ends up hidden behind the footer.
 */
_fitToc: function () {
    var bSingleColumn = this._isSingleColumnLayout();

    // The index is collapsible on small screens only, where it sits in the page
    // flow. On desktop it stays permanently expanded, so the Panel is made
    // non-expandable there: that removes both the toggle behaviour and the space
    // the arrow would occupy.
    var oPanel = this.byId("umTocPanel");
    if (oPanel && oPanel.getExpandable() !== bSingleColumn) {
        oPanel.setExpandable(bSingleColumn);

        // Changing expandability re-renders the Panel and replaces its content
        // DOM, which discards both the height applied below and the highlight on
        // the current entry. Both are therefore re-applied once that render has
        // happened.
        this._deferTocRefresh();
        return;
    }

    // Covers the case where the page was opened at a desktop width and the
    // viewport is later narrowed: the index then adopts its single-column
    // default and starts collapsed. Applied once, so scrolling cannot undo an
    // expand the reader has made.
    if (oPanel && bSingleColumn && !this._bIndexCollapsedByDefault) {
        this._bIndexCollapsedByDefault = true;

        if (oPanel.getExpanded()) {
            oPanel.setExpanded(false);
            this._deferTocRefresh();
            return;
        }
    }

    var oBody = this.byId("umTocBody");
    if (!oBody) return;

    var oBodyDom = oBody.getDomRef();
    if (!oBodyDom) return;

    // Single-column layout: the index is in the page flow and expands fully, so
    // the height cap does not apply.
    if (bSingleColumn) {
        if (oBodyDom.style.maxHeight) {
            oBodyDom.style.maxHeight = "";
        }
        return;
    }

    var oScroller = this._getScrollContainer();
    var oCol = this.byId("umTocCol");
    var oColDom = oCol && oCol.getDomRef();
    var oPanelDom = oPanel && oPanel.getDomRef();
    if (!oColDom || !oPanelDom) return;

    // The footer that closes the page is the quick links block. It is in the
    // page flow rather than pinned, so its measured top is only used while it
    // is on screen and the viewport bottom is the bound otherwise.
    //
    // The lookup is scoped to this page's own DOM. Routed views stay alive in the
    // NavContainer, so a document-wide query can return the footer of the other
    // page that also has one; that page is hidden, its rect is all zeros, and the
    // panel would clamp to its minimum height.
    var oViewDom = this.getView().getDomRef();
    var oFooter = oViewDom
        ? oViewDom.querySelector(".quickLinksWrap")
        : null;
    var iFooterTop = oFooter
        ? Math.min(oFooter.getBoundingClientRect().top, window.innerHeight)
        : window.innerHeight;

    // The panel fills the space left above the footer, so it grows as the page
    // scrolls instead of leaving a dead gap.
    //
    // The reference top is clamped to the sticky offset: while the panel cannot
    // fit (near the end of the page it is pushed up by its container), using the
    // live position would feed back into the height and make the panel grow
    // without bound. Must match the sticky `top` of .tocCol in style.css.
    //
    // When the viewport itself scrolls there is no scroll port inside the page,
    // so the reading area starts at the top of the window.
    var iStickyTop = 8;
    var iPanelTop = oPanelDom.getBoundingClientRect().top;
    var iScrollTop = oScroller ? oScroller.getBoundingClientRect().top : 0;
    var iTop = Math.max(iPanelTop, iScrollTop + iStickyTop);

    var iChrome = oBodyDom.getBoundingClientRect().top - iPanelTop;
    var iGap = 8;

    // The advertisement panel shares this sticky column and sits under the
    // index, so the list stops above it instead of overlapping it.
    var oAdWrap = this.byId("umAdWrap");
    var oAdDom = oAdWrap && oAdWrap.getVisible() ? oAdWrap.getDomRef() : null;
    var iAdHeight = oAdDom ? oAdDom.getBoundingClientRect().height + 12 : 0;

    var iByFooter = iFooterTop - iTop - iChrome - iGap - iAdHeight;

    // A sticky element cannot be pinned past the end of its container, so the
    // height is also bounded by where that container ends.
    var iByContainer = oColDom.parentElement
        ? oColDom.parentElement.getBoundingClientRect().bottom - iTop - iChrome - iAdHeight
        : iByFooter;

    var iHeight = Math.max(180, Math.min(iByFooter, iByContainer));

    // Guarded so a scroll does not trigger needless layout work.
    if (Math.abs(oBodyDom.clientHeight - iHeight) > 1) {
        oBodyDom.style.maxHeight = iHeight + "px";
    }
},

/**
 * Marks the last card that has already reached the top of the reading area.
 * Positions are measured against the scroll container, so the value matches the
 * offset a jump scrolls a card to (the `scroll-margin-top` of .umCard).
 */
_updateActiveToc: function () {
    // A picked entry is pinned in the single-column layout (see _jumpToCard), so
    // the scroll-spy must not walk the highlight away from the reader's choice
    // while the list is off screen. Desktop keeps following the reading position,
    // where the list stays visible.
    if (this._bIndexSelectionPinned) {
        if (this._isSingleColumnLayout()) {
            return;
        }
        this._bIndexSelectionPinned = false;
    }

    var aItems = this._visibleCards();
    if (!aItems.length) {
        this._setActiveToc(null);
        return;
    }

    // While an entry is being scrolled to, the picked one is kept highlighted;
    // the final settle pass resolves it from geometry.
    if (this._iIndexJumpUntil && Date.now() < this._iIndexJumpUntil) {
        return;
    }
    this._iIndexJumpUntil = 0;

    var oScroller = this._getScrollContainer();
    var iTop = oScroller ? oScroller.getBoundingClientRect().top : 0;

    // Viewport metrics of the real scroll port, so the bottom clamp below works
    // whether the page scrolls in its content section or with the viewport.
    var iViewportH, iScrollTop, iScrollH;
    if (oScroller) {
        iViewportH = oScroller.clientHeight;
        iScrollTop = oScroller.scrollTop;
        iScrollH = oScroller.scrollHeight;
    } else {
        iViewportH = window.innerHeight;
        iScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        iScrollH = document.documentElement.scrollHeight;
    }

    var iThreshold = 80;
    var sActive = this._targetOf(aItems[0]);

    // The callback needs the controller, so `this` is passed to forEach: without
    // it `this` is undefined in strict mode and the first card past the threshold
    // throws, which used to abort the pass before the highlight was applied.
    aItems.forEach(function (oItem) {
        var oDom = oItem.getDomRef();

        if (oDom && oDom.getBoundingClientRect().top - iTop <= iThreshold) {
            sActive = this._targetOf(oItem);
        }
    }, this);

    // The last cards can never reach the top of the reading area, because the
    // page stops scrolling first. At the very bottom, take the last card that is
    // on screen instead.
    var bScrollable = iScrollH > iViewportH + 4;
    var bAtBottom = iScrollTop + iViewportH >= iScrollH - 4;

    if (bScrollable && bAtBottom) {
        aItems.forEach(function (oItem) {
            var oDom = oItem.getDomRef();

            if (oDom && oDom.getBoundingClientRect().top - iTop < iViewportH) {
                sActive = this._targetOf(oItem);
            }
        }, this);
    }

    this._setActiveToc(sActive);
},

_setActiveToc: function (sTarget) {
    var oList = this.byId("umTocList");
    if (!oList) return;

    // Remembered so the highlight can be restored after the Panel re-renders
    // its content (see _deferTocRefresh).
    this._sActiveTarget = sTarget || null;

    var oDom = oList.getDomRef();
    if (!oDom) return;

    var aLinks = oDom.querySelectorAll(".tocLink");
    var oActive = null;

    Array.prototype.forEach.call(aLinks, function (a) {
        var sLinkTarget = a.getAttribute("data-target") || a.dataset.target;
        var bActive = !!sTarget && sLinkTarget === sTarget;

        // Inactive entries stay white (_link), the current one switches to the
        // shared teal link style on a white pill.
        a.classList.toggle("active", bActive);
        a.classList.toggle("tealTextLink", bActive);
        a.classList.toggle("_link", !bActive);

        if (bActive) oActive = a;
    });

    this._revealTocEntry(oActive);
},

/**
 * Scrolls the index panel itself so the current entry sits in the middle of the
 * visible list. Centring keeps the entry in view at both ends of the list
 * without any edge padding logic, and only the panel is scrolled, so the reading
 * position is left untouched.
 */
_revealTocEntry: function (oLink) {
    var oBody = this.byId("umTocBody");
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

onTocPress: function (oEvent) {
    // Used for mouse/pointer activation. Touch taps are handled in
    // _allowTouchScrollOverToc, because the gesture is stopped there before it
    // can reach the Link and fire this press.
    this._jumpToCard(oEvent.getSource().data("target"));
},

/**
 * The panel toggles itself and its arrow. Refit on expand so the panel height
 * matches the available space again.
 */
onTocToggle: function () {
    window.setTimeout(function () {
        this._fitToc();
        this._updateActiveToc();
    }.bind(this), 0);
}

	});
});
