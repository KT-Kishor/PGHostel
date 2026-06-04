/*  */sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "../utils/validation",
    "sap/m/ResponsivePopover",
    "sap/m/Text",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",
], function (BaseController, JSONModel, Fragment, utils, ResponsivePopover, Text, MessageToast, MessageBox, Filter, FilterOperator, Formatter) {

    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Booking", {
        Formatter: Formatter,
        onInit: function () {   
            this.getOwnerComponent().getRouter().getRoute("RouteBooking").attachMatched(this._onRouteMatched, this);
            this._iFacilityStartIndex = 0;
            this._iFacilityPageSize = 3; // fallback; recalculated dynamically
            this._iFacilityCardWidth = 250; // base card width (px)
            this._iFacilityCardGap = 16;   // gap between cards (px) – matches CSS gap: 1rem
            // Initialize primary member tracking for toast notifications
            this._sLastPrimaryMemberId = "SELF"; // Default to logged-in user
            // Initialize member data loading flags
            this._bMemberDataLoaded = false;
            this._bMemberDataLoading = false;

            // Resize observer to recalculate visible card count
            this._fnFacilityResizeHandler = this._onFacilityCarouselResize.bind(this);
            sap.ui.core.ResizeHandler.register(this.getView(), this._fnFacilityResizeHandler);

            this.getView().addEventDelegate({
                onBeforeHide: function () {
                    this._resetBookingPageModels();
                }.bind(this)
            });

            this._fnTableResizeHandler =
                this._updateTableColumnWidths.bind(this);

            this._updateTableColumnWidths();

            window.addEventListener(
                "resize",
                this._fnTableResizeHandler
            );

        },
        onAfterRendering: function () {
            this._startAllCarouselsAutoSlide(3000);
            this._attachDocumentInfoHover();
            this._attachFacilityDiscountInfoHover();
            this._attachFacilitiesBreakdownHover();
            this._makeDatePickersReadOnly(["BookStartdate_ID"]);
        },

        _updateTableColumnWidths: function () {
            var oPrimaryColumn = this.byId("primaryColumn");
            var oActionColumn = this.byId("actionColumn");

            var bMobile = sap.ui.Device.system.phone;

            if (oPrimaryColumn) {
                oPrimaryColumn.setWidth(bMobile ? "3rem" : "6rem");
            }

            if (oActionColumn) {
                oActionColumn.setWidth(bMobile ? "3rem" : "6rem");
            }
        },
        onExit: function () {
            if (this._fnFacilityResizeHandler) {
                sap.ui.core.ResizeHandler.deregister(this._fnFacilityResizeHandler);
                this._fnFacilityResizeHandler = null;
            }
            if (this._adCarouselInterval) {
                clearInterval(this._adCarouselInterval);
                this._adCarouselInterval = null;
            }

            // Clean up carousel event handlers
            if (this._adCarouselPauseResumeHandlers) {
                this._adCarouselPauseResumeHandlers.forEach(handler => {
                    if (handler.element && handler.event && handler.fn) {
                        handler.element.detachBrowserEvent(handler.event, handler.fn);
                    }
                });
                this._adCarouselPauseResumeHandlers = null;
            }
            if (this._fnTableResizeHandler) {
                window.removeEventListener(
                    "resize",
                    this._fnTableResizeHandler
                );
                this._fnTableResizeHandler = null;
            }

            BaseController.prototype.onExit.call(this);
        },
        _onRouteMatched: async function () {
            // this.getBusyDialog();
            var LoginFUnction = await this.commonLoginFunction("Booking");
            if (!LoginFUnction) return;

            // if (performance.navigation && performance.navigation.type === 1) {
            //     var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            //     oRouter.navTo("RouteHostel", {}, true);
            // }

            let oHostelModel = sap.ui.getCore().getModel("HostelModel") || this.getView().getModel("HostelModel");
            const oIncomingBookingData = oHostelModel ? JSON.parse(JSON.stringify(oHostelModel.getData() || {})) : {};
            if (!oHostelModel) {
                oHostelModel = new JSONModel({});
                sap.ui.getCore().setModel(oHostelModel, "HostelModel");
            }

            this.getView().setModel(oHostelModel, "HostelModel");
            this.getView().setModel(new JSONModel(this._getBookingViewInitialData()), "BookingView");
            this.getView().setModel(new JSONModel(this._getFacilityModelInitialData()), "FacilityModel");
            this.getView().setModel(new JSONModel(this._getFacilitySelectionInitialData()), "FacilitySelection");
            this.getView().setModel(new JSONModel(this._getPaymentModelInitialData()), "PaymentModel");
            this._resetBookingPageModels();
            oHostelModel.setData(oIncomingBookingData);

            this._initializeBookingData();
            this._prefillLoggedInUser();
            this._syncPropertyTypeState();
            this._syncPlanState();
            await this._loadFacilities();
            this._rebuildSelectedFacilities();
            await this._loadAdvertisements();
            this._recalculateSummary();
            this._makeDatePickersReadOnly(["BookStartdate_ID"]);
            oHostelModel.refresh(true);

            // Start background loading of member data
            this._loadMemberDataInBackground();
        },

        /**
         * Load HM_MemberDocument data in background for F4 help
         * This runs async without await so it doesn't block the UI
         */
        _loadMemberDataInBackground: function () {
            // Prevent multiple simultaneous loads
            if (this._bMemberDataLoading) {
                return;
            }

            this._bMemberDataLoading = true;
            this._bMemberDataLoaded = false;

            const oHostelModel = this.getView().getModel("HostelModel");
            const sUserID = oHostelModel.getProperty("/UserID") || "";

            if (!sUserID) {
                console.warn("Cannot load member data: UserID not available");
                this._bMemberDataLoaded = true;
                this._bMemberDataLoading = false;
                return;
            }

            // Load member data in background
            this.ajaxReadWithJQuery("HM_MemberDocument", { UserID: sUserID })
                .then(oResponse => {
                    if (oResponse && oResponse.data) {
                        const aMemberList = Array.isArray(oResponse.data) ? oResponse.data : [];
                        oHostelModel.setProperty("/MemberList", aMemberList)
                    }
                    this._bMemberDataLoaded = true;
                    this._bMemberDataLoading = false;
                })
                .catch(err => {
                    console.error("❌ Failed to load member data in background:", err);
                    this._bMemberDataLoaded = true; // Still set to true to avoid blocking users
                    this._bMemberDataLoading = false;
                });
        },
        _getBookingViewInitialData: function () {
            return {
                PropertyTypes: [],
                DurationOptions: this._buildKeyTextList(11),
                showDurationSelector: false,
                endDateEditable: false,
                showFamilySection: false,
                showGSTField: false,
                showBusinessTravelOption: false,
                showBusinessGSTSection: false,
                showCustomerDocumentUpload: false,
                maxPersons: 1,
                originalPersonOptions: [],
                DocumentTypeOptions: [
                    { key: "Aadhaar", text: "Aadhaar" },
                    { key: "Passport", text: "Passport" },
                    { key: "Driving License", text: "Driving License" },
                    { key: "Voter ID", text: "Voter ID" }
                ],
                GenderOptions: [
                    { key: "Male", text: "Male" },
                    { key: "Female", text: "Female" },
                    { key: "Other", text: "Other" }
                ],
                RelationshipOptions: [
                    // { key: "Self", text: "Self" },
                    { key: "Father", text: "Father" },
                    { key: "Mother", text: "Mother" },
                    { key: "Brother", text: "Brother" },
                    { key: "Sister", text: "Sister" },
                    { key: "Spouse", text: "Spouse" },
                    { key: "Child", text: "Child" },
                    { key: "Friend", text: "Friend" },
                    { key: "Other", text: "Other" }
                ],
                SalutationOptions: [
                    { key: "Mr.", text: "Mr." },
                    { key: "Mrs.", text: "Mrs." },
                    { key: "Ms.", text: "Ms." },
                    { key: "Dr.", text: "Dr." }
                ],
                MasterMembers: [],
                NewMemberDraft: {
                    Salutation: "",
                    Name: "",
                    Relation: "",
                    Gender: "",
                    DocumentType: "",
                    DocumentName: "",
                    Document: "",
                    File: "",
                    FileType: "",
                    DocumentID: "",
                    DocumentFile: null,
                    Documents: [],
                    PendingDeletedDocumentIDs: [],
                    IsEditMode: false
                },
                NewMemberDialogTitle: "Add New Member",
                NewMemberDialogSaveText: "Save Member",
                FamilyMembers: []
            };
        },

        _getFacilityModelInitialData: function () {
            return {
                Facilities: []
            };
        },

        _getFacilitySelectionInitialData: function () {
            return {
                title: "",
                facilityName: "",
                currency: "",
                selectionMode: "SINGLE",
                selectionModeLabel: "",
                singleOccupantMode: false,
                primaryGuestName: "",
                quantity: 1,
                singlePersonQty: 0,
                facilityChargeType: "Entire Booking",
                selectedPriceType: "",
                personOptions: [],
                selectedPersonIds: [],
                personQuantities: [],
                priceOptions: []
            };
        },

        _getPaymentModelInitialData: function () {
            return {
                Amount: 0,
                PayableNow: 0,
                RemainingBalance: 0,
                PaymentType: "PayOnCheckIn",
                PaymentDate: "",
                BankTransactionID: ""
            };
        },

        _resetBookingPageModels: function () {
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oBookingView = oView.getModel("BookingView");
            const oFacilityModel = oView.getModel("FacilityModel");
            const oFacilitySelectionModel = oView.getModel("FacilitySelection");
            const oPaymentModel = oView.getModel("PaymentModel");

            this._aAllFacilities = [];
            this._iFacilityStartIndex = 0;

            if (oHostelModel) {
                oHostelModel.setData({});
                oHostelModel.refresh(true);
            }

            if (oBookingView) {
                oBookingView.setData(this._getBookingViewInitialData());
                oBookingView.refresh(true);
            }

            if (oFacilityModel) {
                oFacilityModel.setData(this._getFacilityModelInitialData());
                oFacilityModel.refresh(true);
            }

            if (oFacilitySelectionModel) {
                oFacilitySelectionModel.setData(this._getFacilitySelectionInitialData());
                oFacilitySelectionModel.refresh(true);
            }

            if (oPaymentModel) {
                oPaymentModel.setData(this._getPaymentModelInitialData());
                oPaymentModel.refresh(true);
            }

            if (this._oPaymentDialog) {
                this._oPaymentDialog.close();
            }
        },

        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        _loadAdvertisements: async function () {
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_Advertisement");
                const aAdvertisements = oResponse?.data || [];

                // Transform the data to match our carousel structure
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
                // Assuming Photo1, Photo2, Photo3 fields exist
                for (let i = 1; i <= 3; i++) {
                    const sPhotoField = `Photo${i}`;
                    const sNameField = `Photo${i}Name`;
                    const sTypeField = `Photo${i}Type`;

                    if (oAd[sPhotoField]) {
                        // Clean and prepare image data
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

            // Clean the data - remove whitespace
            const sCleanData = sImageData.replace(/\s/g, '');

            // Check if already has data URL prefix
            if (sCleanData.startsWith('data:')) {
                return sCleanData;
            }

            // Determine image type - default to PNG if not specified
            let sType = sImageType || 'image/png';

            // Ensure valid MIME type
            if (!sType.startsWith('image/')) {
                sType = 'image/png';
            }

            // Construct proper data URL
            return `data:${sType};base64,${sCleanData}`;
        },

        _setupAdvertisementModel: function (aCarouselItems) {
            const oAdvertisementModel = new JSONModel({
                Advertisements: aCarouselItems,
                currentPage: 0,
                itemsPerPage: 1
            });
            this.getView().setModel(oAdvertisementModel, "AdvertisementModel");

            // Start carousel auto‑slide if there are advertisements
            if (aCarouselItems.length > 1) {
                this._startAdvertisementCarouselAutoSlide();
            }
        },

        _startAdvertisementCarouselAutoSlide: function () {
            const oCarousel = this.byId("AdvertisementCarousel");
            if (!oCarousel || oCarousel.getPages().length <= 1) {
                // Carousel not ready, retry after a short delay
                setTimeout(() => this._startAdvertisementCarouselAutoSlide(), 300);
                return;
            }

            // Clear any existing interval and event listeners
            if (this._adCarouselInterval) {
                clearInterval(this._adCarouselInterval);
                this._adCarouselInterval = null;
            }

            // Detach previous event listeners if they exist
            if (this._adCarouselPauseResumeHandlers) {
                this._adCarouselPauseResumeHandlers.forEach(handler => {
                    if (handler.element && handler.event && handler.fn) {
                        handler.element.detachBrowserEvent(handler.event, handler.fn);
                    }
                });
            }

            // Store event handlers for cleanup
            this._adCarouselPauseResumeHandlers = [];

            // Create pause/resume function
            const PAUSE_AND_RESUME = () => {
                if (this._adCarouselInterval) {
                    clearInterval(this._adCarouselInterval);
                    this._adCarouselInterval = null;
                }

                // Resume after 3 seconds of inactivity
                setTimeout(() => {
                    if (oCarousel && !oCarousel.bIsDestroyed && oCarousel.getPages().length > 1) {
                        this._startAdvertisementCarouselAutoSlide();
                    }
                }, 3000);
            };

            // Attach events and store references
            ['touchstart', 'mousedown'].forEach(event => {
                const handler = PAUSE_AND_RESUME.bind(this);
                oCarousel.attachBrowserEvent(event, handler);
                this._adCarouselPauseResumeHandlers.push({
                    element: oCarousel,
                    event: event,
                    fn: handler
                });
            });

            // Start auto-scroll with setInterval (cleaner than original with proper cleanup)
            this._adCarouselInterval = setInterval(() => {
                if (oCarousel && !oCarousel.bIsDestroyed) {
                    oCarousel.next();
                } else {
                    clearInterval(this._adCarouselInterval);
                    this._adCarouselInterval = null;
                }
            }, 3000);
        },

        onAdvertisementCarouselChange: function (oEvent) {
            const iNewPage = oEvent.getParameter("currentPage");
            const oAdvertisementModel = this.getView().getModel("AdvertisementModel");
            if (oAdvertisementModel) {
                oAdvertisementModel.setProperty("/currentPage", iNewPage);
            }
        },

        onAdvertisementImagePress: function (oEvent) {
            const oImage = oEvent.getSource();
            const oBindingContext = oImage.getBindingContext("AdvertisementModel");

            if (oBindingContext) {
                const oAdItem = oBindingContext.getObject();
                if (oAdItem && oAdItem.url) {
                    // Open the URL in a new tab
                    window.open(oAdItem.url, "_blank");
                } else {
                    sap.m.MessageToast.show("Advertisement clicked");
                }
            } else {
                sap.m.MessageToast.show("Advertisement clicked");
            }
        },

        _isSinglePersonOnlyPropertyType: function (sPropertyType) {
            const sType = String(sPropertyType || "").trim();
            return sType === "Hostel" || sType === "PG";
        },

        _isGSTEligiblePropertyType: function (sPropertyType) {
            const sType = String(sPropertyType || "").trim();
            return ["Hotel", "Service Apartments", "Rented Properties"].includes(sType);
        },

        _supportsCustomerGSTOverride: function (sPropertyType) {
            const sType = String(sPropertyType || "").trim();
            return ["Hotel", "Service Apartments", "Rented Properties"].includes(sType);
        },

        _shouldShowGSTField: function (sPropertyType) {
            return !this._isSinglePersonOnlyPropertyType(sPropertyType);
        },

        _shouldShowFamilySection: function (sPropertyType, iCapacity) {
            return !this._isSinglePersonOnlyPropertyType(sPropertyType) && Math.max(parseInt(iCapacity, 10) || 1, 1) > 1;
        },

        _validateGSTINField: function (oField) {
            const sValue = String(oField.getValue() || "").trim().toUpperCase();
            const oI18nModel = this.getOwnerComponent().getModel("i18n") || this.getView().getModel("i18n");
            const oResourceBundle = oI18nModel && oI18nModel.getResourceBundle ? oI18nModel.getResourceBundle() : null;

            oField.setValue(sValue);

            if (!sValue) {
                oField.setValueState("None");
                oField.setValueStateText("");
                return true;
            }

            const bValid = utils._LCvalidateGstNumber(oField, "ID");

            oField.setValueStateText(bValid || !oResourceBundle ? "" : oResourceBundle.getText("gstError"));
            return bValid;
        },

        _isValidGSTINValue: function (sValue) {
            return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
                String(sValue || "").trim().toUpperCase()
            );
        },

        onGSTINLiveChange: function (oEvent) {
            const bValid = this._validateGSTINField(oEvent.getSource());
            this.getView().getModel("HostelModel").setProperty("/CustomerGSTIN", oEvent.getSource().getValue());
            this._recalculateSummary();
            return bValid;
        },

        onGSTINChange: function (oEvent) {
            const bValid = this._validateGSTINField(oEvent.getSource());
            this.getView().getModel("HostelModel").setProperty("/CustomerGSTIN", oEvent.getSource().getValue());
            this._recalculateSummary();
            return bValid;
        },

        onBusinessTravelToggle: function (oEvent) {
            const oModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const bSelected = !!oEvent.getParameter("state");

            oModel.setProperty("/IsBusinessTravel", bSelected);
            oBookingView.setProperty("/showBusinessGSTSection", bSelected && !!oBookingView.getProperty("/showBusinessTravelOption"));

            if (!bSelected) {
                this._resetBusinessTravelData();
            }

            this._recalculateSummary();
        },

        _resetBusinessTravelData: function () {
            const oModel = this.getView().getModel("HostelModel");

            oModel.setProperty("/IsBusinessTravel", false);
            oModel.setProperty("/CustomerGSTIN", "");
            oModel.setProperty("/CompanyName", "");
            oModel.setProperty("/CompanyAddress", "");
            oModel.setProperty("/EffectiveGSTType", "");
            oModel.setProperty("/EffectiveGSTValue", 0);
            oModel.setProperty("/CustomerStateCode", "");
            oModel.setProperty("/SourceStateCode", "");
        },

        _getSelectedPersonCount: function () {
            return Math.max(parseInt(this.getView().getModel("HostelModel").getProperty("/SelectedPerson"), 10) || 1, 1);
        },

        _isSingleOccupantBooking: function () {
            return this._getOccupantOptions().length === 1;
        },

        _getPrimaryGuestName: function () {
            return this.getView().getModel("HostelModel").getProperty("/FullName") || "Primary Guest";
        },

        _getOccupantOptions: function () {
            const oBookingView = this.getView().getModel("BookingView");
            const aOccupants = [];

            (oBookingView.getProperty("/FamilyMembers") || []).filter(function (oMember) {
                return oMember.Selected;
            }).forEach(function (oMember) {
                const sName = oMember.Name || oMember.Relation || "Family Member";
                const sSalutation = oMember.Salutation || "";
                const sDisplayName = sSalutation ? sSalutation + " " + sName : sName;
                aOccupants.push({
                    id: oMember.id || oMember.MemberID || "",
                    name: sDisplayName
                });
            });

            return aOccupants;
        },

        _getSelectedOccupantIds: function () {
            return this._getOccupantOptions().map(function (oOccupant) {
                return String(oOccupant.id || "").trim();
            }).filter(Boolean).sort();
        },

        _haveOccupantsChanged: function (aPreviousOccupantIds) {
            const aCurrentOccupantIds = this._getSelectedOccupantIds();
            const aPrevious = Array.isArray(aPreviousOccupantIds) ? aPreviousOccupantIds.slice().sort() : [];

            if (aPrevious.length !== aCurrentOccupantIds.length) {
                return true;
            }

            return aPrevious.some(function (sId, iIndex) {
                return sId !== aCurrentOccupantIds[iIndex];
            });
        },

        _getDefaultOccupant: function () {
            const aOccupants = this._getOccupantOptions();

            return aOccupants.length ? aOccupants[0] : null;
        },


        _getFacilitySelectionMode: function (oFacility) {
            const sMode = String(oFacility.SelectionMode || "").toUpperCase().trim();

            if (["SINGLE", "QTY", "PERSON", "PERSON_QTY"].includes(sMode)) {
                return sMode;
            }

            return "SINGLE";
        },

        _getFacilitySelectionModeLabel: function (sSelectionMode) {
            const mLabels = {
                SINGLE: "Per room",
                QTY: "Quantity based",
                PERSON: "Person selection",
                PERSON_QTY: "Person with quantity"
            };

            return mLabels[sSelectionMode] || "Per room";
        },

        _isFacilityPersonSelectable: function (sSelectionMode) {
            return sSelectionMode === "PERSON";
        },

        _isFacilityQuantityRequired: function (sSelectionMode) {
            return sSelectionMode === "QTY";
        },

        _isFacilityPersonQuantityRequired: function (sSelectionMode) {
            return sSelectionMode === "PERSON_QTY";
        },







  

        _isUnitBasedFacility: function (oFacility) {
            return this._getFacilitySelectionMode(oFacility) === "PERSON_QTY";
        },
        _getFacilityRateUnitText: function (sPriceType) {
            const mUnitLabels = {
                "Package Price": "Package",
                "Unit Price": "Unit",
                "Per Hour": "Hour",
                "Per Day": "Day",
                "Per Month": "Month",
                "Per Year": "Year"
            };

            return mUnitLabels[sPriceType] || "Unit";
        },

        _formatFacilityPriceWithUnit: function (fPrice, sCurrency, sPriceType) {
            return this._toNumber(fPrice) + " " + (sCurrency || "INR") + " / " + this._getFacilityRateUnitText(sPriceType);
        },

        _getFacilityChargeableDayCount: function () {
            const oModel = this.getView().getModel("HostelModel");
            const sPlan = oModel.getProperty("/SelectedPriceType");
            const oStartDate = this._parseDate(oModel.getProperty("/StartDate"));
            const oEndDate = this._parseDate(oModel.getProperty("/EndDate"));
            const iDuration = parseInt(oModel.getProperty("/SelectedMonths") || "1", 10) || 1;
            let oBillingEndDate = null;

            if (!oStartDate || !oEndDate || oEndDate <= oStartDate) {
                return 0;
            }

            if (sPlan === "Per Day") {
                oBillingEndDate = oEndDate;
            } else if (sPlan === "Per Month") {
                oBillingEndDate = new Date(oStartDate);
                oBillingEndDate.setMonth(oBillingEndDate.getMonth() + iDuration);
            } else if (sPlan === "Per Year") {
                oBillingEndDate = new Date(oStartDate);
                oBillingEndDate.setFullYear(oBillingEndDate.getFullYear() + iDuration);
            } else {
                oBillingEndDate = oEndDate;
            }

            if (oBillingEndDate > oEndDate) {
                oBillingEndDate = oEndDate;
            }

            // Calculate base days
            let iDays = Math.max(Math.floor((oBillingEndDate - oStartDate) / 86400000), 0);

            return iDays;
        },

        _buildFacilityPersonLines: function (oFacility) {
            const aOccupants = this._getOccupantOptions();
            const aExisting = Array.isArray(oFacility.PersonQuantities) ? oFacility.PersonQuantities : [];
            const aSelectedIds = Array.isArray(oFacility.SelectedPersonIds) ? oFacility.SelectedPersonIds : [];

            return aOccupants.map(function (oPerson) {
                const oFound = aExisting.find(function (oLine) {
                    return oLine.personId === oPerson.id;
                });

                const bSelected = aSelectedIds.includes(oPerson.id) || (!!oFound && (parseInt(oFound.qty, 10) || 0) > 0);

                return {
                    personId: oPerson.id,
                    personName: oPerson.name,
                    selected: bSelected,
                    qty: oFound ? Math.max(parseInt(oFound.qty, 10) || 0, 0) : 0
                };
            });
        },

        onFacilityPersonSelect: function (oEvent) {
            const oCheckBox = oEvent.getSource();
            const oCtx = oCheckBox.getBindingContext("FacilitySelection");
            const sRowPath = oCtx.getPath();
            const oModel = this.getView().getModel("FacilitySelection");
            const bSelected = oEvent.getParameter("selected");
            const sSelectionMode = oModel.getProperty("/selectionMode");

            if (sSelectionMode === "PERSON") {
                const sPersonId = oModel.getProperty(sRowPath + "/id");
                let aSelectedIds = oModel.getProperty("/selectedPersonIds") || [];

                aSelectedIds = aSelectedIds.slice();

                if (bSelected) {
                    if (!aSelectedIds.includes(sPersonId)) {
                        aSelectedIds.push(sPersonId);
                    }
                } else {
                    aSelectedIds = aSelectedIds.filter(function (sId) {
                        return sId !== sPersonId;
                    });
                }

                oModel.setProperty("/selectedPersonIds", aSelectedIds);
            }

            if (sSelectionMode === "PERSON_QTY") {
                const iFixedQty = Math.max(
                    parseInt(oModel.getProperty(sRowPath + "/fixedQty"), 10) ||
                    parseInt(oModel.getProperty("/minimumQty"), 10) ||
                    1,
                    1
                );

                oModel.setProperty(sRowPath + "/selected", bSelected);
                oModel.setProperty(sRowPath + "/qty", bSelected ? iFixedQty : 0);
            }

            oModel.refresh(true);
        },

        onLaundryQtyChange: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("FacilitySelection");
            const sPath = oCtx.getPath();
            const oSelectionModel = this.getView().getModel("FacilitySelection");
            const bSelected = !!oSelectionModel.getProperty(sPath + "/selected");
            const sSelectionMode = oSelectionModel.getProperty("/selectionMode");

            if (!bSelected) {
                oSelectionModel.setProperty(sPath + "/qty", 0);
                oSelectionModel.refresh(true);
                return;
            }

            let iValue = Math.max(parseInt(oEvent.getParameter("value"), 10) || 0, 0);

            oSelectionModel.setProperty(sPath + "/qty", iValue);
            oSelectionModel.refresh(true);
        },

        onSinglePersonQtyChange: function (oEvent) {
            const oSelectionModel = this.getView().getModel("FacilitySelection");
            const sSelectionMode = oSelectionModel.getProperty("/selectionMode");

            if (sSelectionMode === "PERSON_QTY") {
                let iValue = Math.max(parseInt(oEvent.getParameter("value"), 10) || 0, 0);

                oSelectionModel.setProperty("/singlePersonQty", iValue);
                oSelectionModel.refresh(true);
            }
        },

        formatFacilityPersonSelected: function (sPersonId, aSelectedIds) {
            aSelectedIds = Array.isArray(aSelectedIds) ? aSelectedIds : [];
            return aSelectedIds.includes(sPersonId);
        },

        _getLaundryTotalQty: function (aLines) {
            return (aLines || []).reduce(function (iSum, oLine) {
                return iSum + (Math.max(parseInt(oLine.qty, 10) || 0, 0));
            }, 0);
        },

        _setFacilitySelectionSummary: function (oFacility) {
            const aParts = [];
            const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            const iPersonCount = Array.isArray(oFacility.SelectedPersonIds) ? oFacility.SelectedPersonIds.length : 0;
            const aNames = this._getOccupantOptions().reduce(function (mNames, oPerson) {
                mNames[oPerson.id] = oPerson.name;
                return mNames;
            }, {});
            const aSelectedPersonNames = (oFacility.SelectedPersonIds || []).map(function (sPersonId) {
                return aNames[sPersonId] || sPersonId;
            });

            if (oFacility.SelectedPriceType) {
                aParts.push(
                    this._formatFacilityPriceWithUnit(
                        oFacility.SelectedPrice,
                        oFacility.Currency || "",
                        oFacility.SelectedPriceType
                    )
                );
            }

            if (this._supportsFacilityChargeType(sSelectionMode)) {
                aParts.push("Charge: " + this._getFacilityChargeTypeLabel(this._getFacilityChargeType(oFacility)));
            }

            if (sSelectionMode === "PERSON" && iPersonCount > 0) {
                aParts.push("For: " + aSelectedPersonNames.join(", "));
            }

            if (sSelectionMode === "QTY") {
                aParts.push("Qty " + (parseInt(oFacility.Quantity, 10) || 1));
            }

            if (sSelectionMode === "PERSON_QTY") {
                const aBreakdown = (oFacility.PersonQuantities || []).filter(function (oLine) {
                    return (parseInt(oLine.qty, 10) || 0) > 0;
                }).map(function (oLine) {
                    return (oLine.personName || aNames[oLine.personId] || oLine.personId) + " (" + (parseInt(oLine.qty, 10) || 0) + ")";
                });

                if (aBreakdown.length > 0) {
                    aParts.push("Breakdown: " + aBreakdown.join(", "));
                }
            }

            oFacility.SelectionSummary = aParts.join(" | ");
        },

        _getFacilityCardPriceText: function (oFacility) {
            let sPriceText = "";

            if (oFacility.Selected && oFacility.SelectedPriceType) {
                sPriceText = this._formatFacilityPriceWithUnit(
                    oFacility.SelectedPrice,
                    oFacility.Currency || "INR",
                    oFacility.SelectedPriceType
                );
            } else if (oFacility.DisplayPrice) {
                sPriceText = oFacility.DisplayPrice;
            } else {
                sPriceText = this._formatFacilityPriceWithUnit(
                    oFacility.CurrentPrice || oFacility.UnitPrice || 0,
                    oFacility.Currency || "INR",
                    oFacility.CurrentPriceType || "Unit Price"
                );
            }

            return sPriceText;
        },

        _getFacilityCardDetailText: function (oFacility) {
            const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);

            if (!oFacility.Selected) {
                return "Customize this facility for your booking.";
            }

            if (sSelectionMode === "PERSON") {
                const aSelectedPersonNames = (oFacility.SelectedPersonIds || []).map(function (sPersonId) {
                    const oPerson = this._getOccupantOptions().find(function (oOption) {
                        return oOption.id === sPersonId;
                    });

                    return oPerson ? oPerson.name : sPersonId;
                }.bind(this)).filter(Boolean);

                return aSelectedPersonNames.length ? "For: " + aSelectedPersonNames.join(", ") : "Added to this booking";
            }

            if (sSelectionMode === "QTY") {
                return "Quantity: " + Math.max(parseInt(oFacility.Quantity, 10) || 1, 1);
            }

            if (sSelectionMode === "PERSON_QTY") {
                const aBreakdown = (oFacility.PersonQuantities || []).filter(function (oLine) {
                    return (parseInt(oLine.qty, 10) || 0) > 0;
                }).map(function (oLine) {
                    return (oLine.personName || oLine.personId || "Guest") + " x" + (parseInt(oLine.qty, 10) || 0);
                });
                const sChargeType = this._getFacilityChargeTypeLabel(this._getFacilityChargeType(oFacility));

                if (aBreakdown.length > 0) {
                    return sChargeType + " | " + aBreakdown.join(", ");
                }

                return sChargeType;
            }

            return "Added to this booking";
        },

        _getFacilityCardSummaryText: function (oFacility) {
            return "";
        },

        _getFacilityCardTotalAmount: function (oFacility) {
            if (!oFacility || !oFacility.Selected) {
                return 0;
            }

            const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            const sPriceType = oFacility.SelectedPriceType || oFacility.CurrentPriceType || "Unit Price";
            const fPrice = this._toNumber(oFacility.SelectedPrice || oFacility.CurrentPrice || oFacility.UnitPrice);
            const oUnits = this._getBookingUnits();
            const iChargeableDayCount = this._getFacilityChargeableDayCount();
            const iQuantity = Math.max(parseInt(oFacility.Quantity, 10) || 1, 1);
            const iPersonCount = Array.isArray(oFacility.SelectedPersonIds)
                ? oFacility.SelectedPersonIds.length
                : 0;

            let fPeriodMultiplier = 1;
            let fTotal = 0;

            if (sPriceType === "Per Day") {
                fPeriodMultiplier = oUnits.days || 1;
            } else if (sPriceType === "Per Month") {
                fPeriodMultiplier = oUnits.months || 1;
            } else if (sPriceType === "Per Year") {
                fPeriodMultiplier = oUnits.years || 1;
            }

            if (sSelectionMode === "QTY") {
                fTotal = fPrice * fPeriodMultiplier * iQuantity;
            } else if (sSelectionMode === "PERSON") {
                fTotal = fPrice * fPeriodMultiplier * Math.max(iPersonCount, 1);
            } else if (sSelectionMode === "PERSON_QTY") {
                const aPersonQuantities = Array.isArray(oFacility.PersonQuantities)
                    ? oFacility.PersonQuantities
                    : [];

                const aValidLines = aPersonQuantities.filter(function (oLine) {
                    return (parseInt(oLine.qty, 10) || 0) > 0;
                });

                const iSelectedPersonCount = aValidLines.length;
                const fPackagePrice = this._toNumber(
                    oFacility.MinimumPrice || oFacility.SelectedPrice || oFacility.CurrentPrice
                );
                const sFacilityChargeType = this._getFacilityChargeType(oFacility);

                if (sFacilityChargeType === "DAILY") {
                    fTotal = fPackagePrice * iSelectedPersonCount * iChargeableDayCount;
                } else {
                    fTotal = fPackagePrice * iSelectedPersonCount;
                }
            } else {
                fTotal = fPrice * fPeriodMultiplier;
            }

            return Number(fTotal.toFixed(2));
        },

        _getFacilityCardTotalText: function (oFacility) {
            if (!oFacility.Selected) {
                return "";
            }

            return "Total: " + this._getFacilityCardTotalAmount(oFacility) + " " + (oFacility.Currency || "INR");
        },

        _getFacilityCardActionText: function (oFacility) {
            return oFacility.Selected ? "Tap to update" : "Tap to add";
        },

        _loadFacilities: async function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const sBranchCode = oHostelModel.getProperty("/BranchCode");
            const iExtraBed = this._toNumber(oHostelModel.getProperty("/ExtraBed"));
            const aSelectedFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];

            this._aAllFacilities = [];

            if (!sBranchCode) {
                this.getView().getModel("FacilityModel").setProperty("/Facilities", []);
                this._renderFacilityCards();
                return;
            }

            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_Facilities", { BranchCode: sBranchCode });
                const aFacilities = oResponse?.data || [];

                this._aAllFacilities = aFacilities
                    .filter(function (oFacility) {
                        if ((oFacility.Type || "").toLowerCase().trim() === "extra bed") {
                            return iExtraBed > 0;
                        }
                        return true;
                    })
                    .map(function (oFacility) {
                        const oSelectedFacility = aSelectedFacilities.find(function (oSelected) {
                            return String(oSelected.FacilityID || "") === String(oFacility.ID || "");
                        }) || {};

                        // const sSelectionMode = oSelectedFacility.SelectionMode || oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                        // const bIsPersonQty = sSelectionMode === "PERSON_QTY";
                        // const iMinimumQty = bIsPersonQty ? (parseInt(oFacility.MinimumQty, 10) || 0) : 0;
                        // const fMinimumPrice = bIsPersonQty ? (parseFloat(oFacility.MinimumPrice) || 0) : 0;
             

                        const sSelectionMode = oSelectedFacility.SelectionMode || oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                        const bIsPersonQty = sSelectionMode === "PERSON_QTY";

                        const iMinimumQty = bIsPersonQty
                            ? (parseInt(oFacility.MinimumQty, 10) || 0)
                            : 0;

                        const fMinimumPrice = bIsPersonQty
                            ? (parseFloat(oFacility.MinimumPrice) || 0)
                            : 0;

                        const sApiFacilityChargeType = bIsPersonQty
                            ? this._normalizeFacilityChargeType(oFacility.FacilityChargeType)
                            : "";
                        return {
                            FacilityID: oFacility.ID,
                            FacilityName: oFacility.FacilityName || oFacility.Type,
                            Type: oFacility.Type,
                            SelectionMode: sSelectionMode,
                            BranchCode: oFacility.BranchCode,
                            Currency: oFacility.Currency || oHostelModel.getProperty("/Currency") || "INR",
                            Image: this._getFacilityImageSource(oFacility),
                            UnitPrice: this._toNumber(oFacility.UnitPrice),
                            PricePerHour: this._toNumber(oFacility.PerHourPrice),
                            PricePerDay: this._toNumber(oFacility.PerDayPrice),
                            PricePerMonth: this._toNumber(oFacility.PerMonthPrice),
                            PricePerYear: this._toNumber(oFacility.PerYearPrice),
                            Selected: !!oSelectedFacility.FacilityID,
                            SelectedPrice: this._toNumber(oSelectedFacility.SelectedPrice || oSelectedFacility.Price),
                            SelectedPriceType: oSelectedFacility.SelectedPriceType || oSelectedFacility.UnitText || "",
                            Quantity: this._toNumber(oSelectedFacility.Quantity) || 1,
                            SelectedPersonIds: Array.isArray(oSelectedFacility.SelectedPersonIds)
                                ? oSelectedFacility.SelectedPersonIds.slice()
                                : [],
                            PersonQuantities: Array.isArray(oSelectedFacility.PersonQuantities)
                                ? oSelectedFacility.PersonQuantities.map(function (oLine) {
                                    return {
                                        personId: oLine.personId,
                                        personName: oLine.personName,
                                        qty: Math.max(parseInt(oLine.qty, 10) || 0, 0)
                                    };
                                })
                                : [],
                            SelectionModeLabel: this._getFacilitySelectionModeLabel(sSelectionMode),
                            ApiFacilityChargeType: sApiFacilityChargeType,
                            FacilityChargeType: sApiFacilityChargeType,
                            MinimumQty: iMinimumQty,
                            MinimumPrice: fMinimumPrice,
                            PackageQty: iMinimumQty,
                            PackagePrice: fMinimumPrice
                            
                        };
                    }.bind(this));

                this._syncSelectedFacilityPersonsWithOccupants();
                this._applyFacilityPriceFilter();
            } catch (oError) {
                console.error("[Booking] Failed to load facilities:", oError);
                this.getView().getModel("FacilityModel").setProperty("/Facilities", []);
                this._renderFacilityCards();
            }
        },
        _syncSelectedFacilityPersonsWithOccupants: function () {
            const aOccupants = this._getOccupantOptions();
            const aValidOccupants = aOccupants.map(function (oItem) {
                return oItem.id;
            });
            const oDefaultOccupant = aOccupants[0] || this._getDefaultOccupant();
            const fnGetOccupantName = function (sPersonId) {
                const oMatch = aOccupants.find(function (oOccupant) {
                    return oOccupant.id === sPersonId;
                });

                return oMatch ? oMatch.name : sPersonId;
            };

            (this._aAllFacilities || []).forEach(function (oFacility) {
                const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);

                if (!Array.isArray(oFacility.SelectedPersonIds)) {
                    oFacility.SelectedPersonIds = [];
                }

                oFacility.SelectedPersonIds = oFacility.SelectedPersonIds.filter(function (sId) {
                    return aValidOccupants.includes(sId);
                });

                if (sSelectionMode === "PERSON" && oFacility.Selected && oFacility.SelectedPersonIds.length === 0 && oDefaultOccupant) {
                    oFacility.SelectedPersonIds = [oDefaultOccupant.id];
                }

                if (sSelectionMode === "PERSON_QTY") {
                    oFacility.PersonQuantities = this._buildFacilityPersonLines(oFacility).filter(function (oLine) {
                        return aValidOccupants.includes(oLine.personId);
                    });
                }

                if (sSelectionMode !== "PERSON_QTY") {
                    oFacility.PersonQuantities = Array.isArray(oFacility.PersonQuantities) ? oFacility.PersonQuantities.map(function (oLine) {
                        return Object.assign({}, oLine, {
                            personName: fnGetOccupantName(oLine.personId)
                        });
                    }).filter(function (oLine) {
                        return aValidOccupants.includes(oLine.personId);
                    }) : [];
                }

                this._setFacilitySelectionSummary(oFacility);
            }.bind(this));

            this.getView().getModel("FacilityModel").refresh(true);
        },



        // Replace or update the part where CurrentPrice and CurrentPriceType are assigned
        _applyFacilityPriceFilter: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oFacilityModel = this.getView().getModel("FacilityModel");
            const sPlan = oModel.getProperty("/SelectedPriceType");

            if (!oFacilityModel) return;

            (this._aAllFacilities || []).forEach(function (oFacility) {
                const aPriceOptions = this._buildFacilityPriceOptions(oFacility);
                const oMatchedOption = aPriceOptions.find(function (oOption) {
                    return oOption.key === sPlan;
                }) || aPriceOptions.find(function (oOption) {
                    return oOption.key === "Unit Price" || oOption.key === "Package Price";
                });

                if (oMatchedOption) {
                    return;
                }

                oFacility.Selected = false;
                oFacility.SelectedPrice = 0;
                oFacility.SelectedPriceType = "";
                oFacility.CurrentPrice = 0;
                oFacility.CurrentPriceType = "";
                oFacility.DisplayPrice = "";
                oFacility.SelectionSummary = "";
            }.bind(this));

            oFacilityModel.setProperty("/Facilities", (this._aAllFacilities || [])
                .filter(function (oFacility) {
                    const aPriceOptions = this._buildFacilityPriceOptions(oFacility);
                    return aPriceOptions.some(function (oOption) {
                        return oOption.key === sPlan || oOption.key === "Unit Price" || oOption.key === "Package Price"
                    });
                }.bind(this))
                .map(oFacility => {
                    const aPriceOptions = this._buildFacilityPriceOptions(oFacility);
                    const oMatchedOption = aPriceOptions.find(function (oOption) {
                        return oOption.key === sPlan;
                    }) || aPriceOptions.find(function (oOption) {
                        return oOption.key === sPlan || oOption.key === "Unit Price" || oOption.key === "Package Price"
                    });
                    const fCurrentPrice = oMatchedOption ? this._toNumber(oMatchedOption.price) : 0;
                    const sCurrentPriceType = oMatchedOption ? oMatchedOption.key : sPlan;

                    oFacility.CurrentPrice = fCurrentPrice;
                    oFacility.CurrentPriceType = sCurrentPriceType;
                    oFacility.DisplayPrice = this._formatFacilityPriceWithUnit(
                        fCurrentPrice,
                        oFacility.Currency || "INR",
                        sCurrentPriceType
                    );
                    oFacility.SelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                    oFacility.SelectionModeLabel = this._getFacilitySelectionModeLabel(oFacility.SelectionMode);
                    // oFacility.FacilityChargeType = this._getFacilityChargeType(oFacility);
                    if (oFacility.SelectionMode === "PERSON_QTY") {
                        oFacility.FacilityChargeType = this._getFacilityChargeType(oFacility);
                    }
                    // Update selection summary
                    if (oFacility.Selected) {
                        oFacility.SelectedPrice = fCurrentPrice;
                        oFacility.SelectedPriceType = sCurrentPriceType;
                    }

                    this._setFacilitySelectionSummary(oFacility);
                    return oFacility;
                })
            );

            this._renderFacilityCards();
            this._rebuildSelectedFacilities();
        },



        _openFacilitySelectionDialog: function (oFacility, oOpenBy) {
            const oSelectionModel = this.getView().getModel("FacilitySelection");
            const sPlan = oFacility.CurrentPriceType || "Unit Price";
            const fPrice = oFacility.CurrentPrice || oFacility.UnitPrice || 0;
            const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            const bIsSingleOccupant = this._isSingleOccupantBooking();
            const oDefaultOccupant = this._getDefaultOccupant();
            const sSelectedOccupantName = oDefaultOccupant && oDefaultOccupant.name ? oDefaultOccupant.name : this._getPrimaryGuestName();

            let aPersonOptions = this._getOccupantOptions() || [];
            let aPersonQuantities = oFacility.PersonQuantities || [];
            let aSelectedPersonIds = Array.isArray(oFacility.SelectedPersonIds) ? oFacility.SelectedPersonIds.slice() : [];
            let iSinglePersonQty = 1;

            if (aPersonOptions.length < 1) {
                MessageToast.show("Please select at least one occupant before choosing a facility.");
                return;
            }

            if (bIsSingleOccupant && sSelectionMode === "PERSON") {
                aSelectedPersonIds = [oDefaultOccupant.id];
            }

            if (sSelectionMode === "PERSON_QTY") {
                const iFixedPackageQty = Math.max(parseInt(oFacility.MinimumQty, 10) || 1, 1);

                aPersonQuantities = this._buildFacilityPersonLines(oFacility).map(function (oLine) {
                    const iExistingQty = Math.max(parseInt(oLine.qty, 10) || 0, 0);
                    const bSelected = !!oLine.selected || iExistingQty > 0;

                    return {
                        personId: oLine.personId,
                        personName: oLine.personName,
                        selected: bSelected,
                        qty: bSelected ? iFixedPackageQty : 0,
                        fixedQty: iFixedPackageQty
                    };
                });

                aSelectedPersonIds = aPersonQuantities
                    .filter(function (oLine) {
                        return !!oLine.selected;
                    })
                    .map(function (oLine) {
                        return oLine.personId;
                    });

                if (bIsSingleOccupant && oDefaultOccupant) {
                    aPersonQuantities = [{
                        personId: oDefaultOccupant.id,
                        personName: oDefaultOccupant.name || sSelectedOccupantName,
                        selected: true,
                        qty: iFixedPackageQty,
                        fixedQty: iFixedPackageQty
                    }];
                    aSelectedPersonIds = [oDefaultOccupant.id];
                }

                iSinglePersonQty = iFixedPackageQty;
            }

            const iMinimumQty = sSelectionMode === "PERSON_QTY" ? (oFacility.MinimumQty !== undefined ? parseInt(oFacility.MinimumQty, 10) : 0) : 0;
            const fMinimumPrice = sSelectionMode === "PERSON_QTY" ? (oFacility.MinimumPrice !== undefined ? parseFloat(oFacility.MinimumPrice) : 0) : 0;
            const fUnitPrice = fPrice;
            const sFacilityChargeType = this._getFacilityChargeType(oFacility);

            // Check if in edit mode (from BookingView model in EditBooking, or default true in Booking)
            var oBookingView = this.getView().getModel("BookingView");
            var bEditModeEnabled = oBookingView ? oBookingView.getProperty("/editModeEnabled") : true;

            oSelectionModel.setData({
                title: oFacility.DisplayFacilityName || oFacility.FacilityName,
                DisplayPrice: this._formatFacilityPriceWithUnit(
                    fPrice,
                    oFacility.Currency || "INR",
                    sPlan
                ),
                selectionMode: sSelectionMode,
                selectionModeLabel: oFacility.SelectionModeLabel || this._getFacilitySelectionModeLabel(sSelectionMode),
                singleOccupantMode: bIsSingleOccupant,
                primaryGuestName: sSelectedOccupantName,
                quantity: oFacility.Quantity || 1,
                singlePersonQty: iSinglePersonQty,
                // facilityChargeType: this._getFacilityChargeType(oFacility),
                selectedPriceType: sPlan,
                selectedPrice: fPrice,
                selectedPersonIds: aSelectedPersonIds,
                personQuantities: Array.isArray(aPersonQuantities) ? aPersonQuantities : [],
                personOptions: Array.isArray(aPersonOptions) ? aPersonOptions : [],
                // Minimum package fields for PERSON_QTY facilities
                // facilityChargeType: this._getFacilityChargeType(oFacility),
                facilityChargeType: sFacilityChargeType,
                minimumQty: iMinimumQty,
                minimumPrice: fMinimumPrice,
                unitPrice: fUnitPrice,
                packageQty: iMinimumQty,
                packagePrice: fMinimumPrice,
                editModeEnabled: bEditModeEnabled
            });
            

            const oFacilityPopover = this._getFacilitySelectionDialog();

            var sPopoverWidth = "20rem";
            if (sSelectionMode === "QTY" || sSelectionMode === "SINGLE") {
                sPopoverWidth = "18rem";
            } else if (sSelectionMode === "PERSON_QTY") {
                sPopoverWidth = "26rem";
            }
            if (sap.ui.Device.system.phone) {
                sPopoverWidth = "95vw";
                oFacilityPopover.setContentHeight(null);
                this._applyMobilePopoverDialogBehavior(oFacilityPopover, "mobileAutoHeightPopoverDialog");
            }
            oFacilityPopover.setContentWidth(sPopoverWidth);

            oFacilityPopover.data("facilityRef", oFacility);
            this._oFacilityRemoveButton.setVisible(!!oFacility.Selected);
            this._oFacilityRemoveButton.setEnabled(bEditModeEnabled);

            // Set initial focus on Confirm button instead of Cancel
            if (this._oFacilityConfirmButton) {
                oFacilityPopover.setInitialFocus(this._oFacilityConfirmButton);
            }

            if (oOpenBy && oFacilityPopover.openBy) {
                oFacilityPopover.openBy(oOpenBy);
                return;
            }

            oFacilityPopover.open();
        },







 


        // 
        onLaundryQtyChange: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("FacilitySelection");
            const sPath = oCtx.getPath();
            const oSelectionModel = this.getView().getModel("FacilitySelection");
            const iValue = Math.max(parseInt(oEvent.getParameter("value"), 10) || 0, 0);

            oSelectionModel.setProperty(sPath + "/qty", iValue);
            oSelectionModel.refresh(true);
        },
        formatLaundryPersons: function (aPersonQuantities) {
            if (!Array.isArray(aPersonQuantities)) return "";
            return aPersonQuantities.map(function (oLine) {
                return oLine.personName + ": " + oLine.qty;
            }).join("\n");
        },

        _getFacilitySelectionDialog: function () {
            if (this._oFacilityDialog) {
                return this._oFacilityDialog;
            }

            const oDialog = new ResponsivePopover({
                contentWidth: sap.ui.Device.system.phone ? "95vw" : "30rem",
                placement: sap.ui.Device.system.phone ? sap.m.PlacementType.VerticalPreferredBottom : sap.m.PlacementType.Auto,
                verticalScrolling: true,
                horizontalScrolling: false,
                showCloseButton: false,
                customHeader: new sap.m.Bar({
                    contentMiddle: [
                        new sap.m.Title({
                            text: "{FacilitySelection>/title}"
                        })
                    ]
                }).addStyleClass("popbarheader"),
                content: [
                    new sap.m.VBox({
                        width: sap.ui.Device.system.phone ? "95%" : "95%",
                        items: [
                            new sap.m.HBox({
                                width: "100%",
                                wrap: "Wrap",
                                alignItems: "Start",
                                items: [
                                    new sap.m.Text({
                                        text: "Price",
                                        wrapping: true
                                    }).addStyleClass("sapMTextBold sapUiTinyMarginEnd"),
                                    new sap.m.Text({
                                        text: "{FacilitySelection>/DisplayPrice}",
                                        wrapping: true
                                    }).addStyleClass("sapUiTinyMarginEnd"),
                                ]
                                    }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd"),

                            // Informational MessageStrip for PERSON_QTY facilities with valid minimum offer
                            new sap.m.VBox({
                                visible: {
                                    parts: [
                                        { path: "FacilitySelection>/selectionMode" },
                                        { path: "FacilitySelection>/minimumQty" },
                                        { path: "FacilitySelection>/minimumPrice" }
                                    ],
                                    formatter: function (sSelectionMode, iMinimumQty, fMinimumPrice) {
                                        // Show only for PERSON_QTY facilities with valid minimum offer
                                        return sSelectionMode === "PERSON_QTY" &&
                                            iMinimumQty > 0 &&
                                            fMinimumPrice >= 0; // fMinimumPrice can be 0 or greater
                                    }
                                },
                                items: [
                                    new sap.m.MessageStrip({
                                        text: {
                                            parts: [
                                                { path: "FacilitySelection>/minimumQty" },
                                                { path: "FacilitySelection>/minimumPrice" },
                                                { path: "FacilitySelection>/facilityChargeType" }
                                            ],
                                            formatter: function (iMinimumQty, fMinimumPrice, sChargeType) {
                                                const iQty = parseInt(iMinimumQty, 10) || 0;
                                                const fPrice = parseFloat(fMinimumPrice) || 0;
                                                const sNormalizedChargeType = String(sChargeType || "").trim().toUpperCase();

                                                const sChargeLabel = sNormalizedChargeType === "DAILY"
                                                    ? "per day"
                                                    : "once for the entire booking";

                                                return "Package: " + iQty + " item(s) for ₹" + fPrice.toFixed(2) +
                                                    " per selected person, charged " + sChargeLabel + ".";
                                            }
                                        },
                                        type: "Information",
                                        showIcon: true,
                                        showCloseButton: false
                                    }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd")
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd"),

                            new sap.m.HBox({
                                width: "100%",
                                wrap: "Wrap",
                                alignItems: "Center",
                                visible: {
                                    parts: [
                                        { path: "FacilitySelection>/selectionMode" },
                                        { path: "FacilitySelection>/singleOccupantMode" }
                                    ],
                                    formatter: function (sSelectionMode, bSingleOccupantMode) {
                                        return sSelectionMode === "PERSON_QTY" && !bSingleOccupantMode;
                                    }
                                },
                                items: [
                                    new sap.m.Text({
                                        text: "Applicable"
                                    }).addStyleClass("sapMTextBold sapUiTinyMarginEnd"),

                                    new sap.m.Text({
                                        text: {
                                            path: "FacilitySelection>/facilityChargeType",
                                            formatter: function (sChargeType) {
                                                return String(sChargeType || "").toUpperCase() === "DAILY"
                                                    ? "Daily"
                                                    : "Once per booking";
                                            }
                                        }
                                    })
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd"),

                            new sap.m.HBox({
                                alignItems: "Center",
                                visible: {
                                    path: "FacilitySelection>/selectionMode",
                                    formatter: function (sSelectionMode) {
                                        return sSelectionMode === "QTY";
                                    }
                                },
                                items: [
                                    new sap.m.Label({
                                        text: "Quantity",
                                        design: "Bold"
                                    }).addStyleClass("sapUiTinyMarginEnd"),
                                    new sap.m.StepInput({
                                        width: "7rem",
                                        min: 1,
                                        value: "{FacilitySelection>/quantity}",
                                        enabled: "{FacilitySelection>/editModeEnabled}"
                                    }).addStyleClass("facilityQtyModeStepInput")
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom sapUiSmallMarginBeginEnd"),

                            new sap.m.VBox({
                                visible: {
                                    parts: [
                                        { path: "FacilitySelection>/selectionMode" },
                                        { path: "FacilitySelection>/singleOccupantMode" }
                                    ],
                                    formatter: function (sSelectionMode, bSingleOccupantMode) {
                                        return sSelectionMode === "PERSON" && !bSingleOccupantMode;
                                    }
                                },
                                items: [
                                    new sap.m.Label({
                                        text: "Select Person(s)",
                                        design: "Bold"
                                    }).addStyleClass("sapUiTinyMarginBottom"),

                                    new sap.m.Table({
                                        inset: false,
                                        growing: false,
                                        width: sap.ui.Device.system.phone ? "95%" : "97%",
                                        columns: [
                                            new sap.m.Column({
                                                width: sap.ui.Device.system.phone ? "4rem" : "3.2rem",
                                                header: new sap.m.Text({
                                                    text: "Pick",
                                                    wrapping: false
                                                }).addStyleClass("sapUiTinyMarginEnd"),
                                            }),
                                            new sap.m.Column({
                                                header: new sap.m.Text({ text: "Person" }).addStyleClass("sapUiTinyMarginEnd"),
                                            })
                                        ],
                                        items: {
                                            path: "FacilitySelection>/personOptions",
                                            template: new sap.m.ColumnListItem({
                                                cells: [
                                                    new sap.m.CheckBox({
                                                        selected: {
                                                            parts: [
                                                                { path: "FacilitySelection>id" },
                                                                { path: "FacilitySelection>/selectedPersonIds" }
                                                            ],
                                                            formatter: this.formatFacilityPersonSelected.bind(this)
                                                        },
                                                        select: this.onFacilityPersonSelect.bind(this),
                                                        enabled: "{FacilitySelection>/editModeEnabled}"
                                                    }),
                                                    new sap.m.Text({
                                                        text: "{FacilitySelection>name}"
                                                    }).addStyleClass("sapUiTinyMarginEnd"),
                                                ]
                                            })
                                        }
                                    }).addStyleClass("sapUiNoMargin"),
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd"),

                            new sap.m.VBox({
                                visible: {
                                    parts: [
                                        { path: "FacilitySelection>/selectionMode" },
                                        { path: "FacilitySelection>/singleOccupantMode" }
                                    ],
                                    formatter: function (sSelectionMode, bSingleOccupantMode) {
                                        return sSelectionMode === "PERSON" && bSingleOccupantMode;
                                    }
                                },
                                items: [
                                    new sap.m.MessageStrip({
                                        text: {
                                            path: "FacilitySelection>/primaryGuestName",
                                            formatter: function (sPrimaryGuestName) {
                                                return "Facility will be applied to " + (sPrimaryGuestName || "Primary Guest");
                                            }
                                        },
                                        type: "Information",
                                        showIcon: true,
                                        showCloseButton: false
                                    }).addStyleClass("sapUiTinyMarginEnd"),
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd"),
                            new sap.m.VBox({
                                visible: {
                                    parts: [
                                        { path: "FacilitySelection>/selectionMode" },
                                        { path: "FacilitySelection>/singleOccupantMode" }
                                    ],
                                    formatter: function (sSelectionMode, bSingleOccupantMode) {
                                        return sSelectionMode === "PERSON_QTY" && !bSingleOccupantMode;
                                    }
                                },
                                items: [
                                    // new sap.m.Label({
                                    //     text: "Person-wise quantity breakdown",
                                    //     design: "Bold"
                                    // }).addStyleClass("sapUiTinyMarginBottom"),

                                    new sap.m.Table({
                                        inset: false,
                                        width: sap.ui.Device.system.phone ? "100%" : "90%",
                                        fixedLayout: "Strict",
                                        showSeparators: "Inner",
                                        columns: [
                                            new sap.m.Column({
                                                width: "4rem",
                                                header: new sap.m.Text({
                                                    text: "Pick"
                                                })
                                            }),
                                            new sap.m.Column({
                                                width: "60%",
                                                header: new sap.m.Text({
                                                    text: "Person"
                                                })
                                            }),
                                            new sap.m.Column({
                                                width: "7rem",
                                                hAlign: "End",
                                                header: new sap.m.Text({
                                                    text: "Qty",
                                                    textAlign: "End",
                                                    width: "100%"
                                                })
                                            })
                                        ],
                                        items: {
                                            path: "FacilitySelection>/personQuantities",
                                            template: new sap.m.ColumnListItem({
                                                cells: [
                                                    new sap.m.CheckBox({
                                                        selected: "{FacilitySelection>selected}",
                                                        select: this.onFacilityPersonSelect.bind(this),
                                                        enabled: "{FacilitySelection>/editModeEnabled}"
                                                    }),

                                                    new sap.m.Text({
                                                        text: "{FacilitySelection>personName}",
                                                        wrapping: true
                                                    }),

                                                    new sap.m.Text({
                                                        text: {
                                                            path: "FacilitySelection>fixedQty",
                                                            formatter: function (iQty) {
                                                                return "Qty: " + (parseInt(iQty, 10) || 0);
                                                            }
                                                        },
                                                        textAlign: "End",
                                                        width: "100%"
                                                    }).addStyleClass("sapMTextBold")
                                                ]
                                            })
                                        }
                                    }).addStyleClass("facilityPersonQtyTable sapUiTinyMarginEnd")
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd"),

                       
                            new sap.m.VBox({
                                visible: {
                                    parts: [
                                        { path: "FacilitySelection>/selectionMode" },
                                        { path: "FacilitySelection>/singleOccupantMode" }
                                    ],
                                    formatter: function (sSelectionMode, bSingleOccupantMode) {
                                        return sSelectionMode === "PERSON_QTY" && bSingleOccupantMode;
                                    }
                                },
                                items: [
                                    new sap.m.Title({
                                        text: {
                                            path: "FacilitySelection>/primaryGuestName",
                                            formatter: function (sPrimaryGuestName) {
                                                return "Facility will be applied to " + (sPrimaryGuestName || "Primary Guest");
                                            }
                                        },
                                        level: "H6",
                                        wrapping: true
                                    }).addStyleClass("sapUiTinyMarginEnd")
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd")
                        ]
                    }).addStyleClass("sapUiContentPadding sapUiSmallMargin")
                ],
                footer: new sap.m.Toolbar({
                    content: [
                        this._oFacilityRemoveButton = new sap.m.Button({
                            text: "Remove",
                            type: "Transparent",
                            visible: false,
                            enabled: "{FacilitySelection>/editModeEnabled}",
                            press: this.onFacilityDialogRemove.bind(this)
                        }).addStyleClass("myUnifiedBtn"),
                        new sap.m.ToolbarSpacer(),
                        new sap.m.Button({
                            text: "Cancel",
                            press: function () {
                                oDialog.close();
                            }
                        }).addStyleClass("myUnifiedBtn"),
                        this._oFacilityConfirmButton = new sap.m.Button({
                            text: "Confirm",
                            type: "Emphasized",
                            enabled: "{FacilitySelection>/editModeEnabled}",
                            press: this.onFacilityDialogConfirm.bind(this)
                        }).addStyleClass("myUnifiedBtn")
                    ]
                })
            });

            if (sap.ui.Device.system.phone && oDialog._oControl && oDialog._oControl.setStretch) {
                this._applyMobilePopoverDialogBehavior(oDialog, "mobileAutoHeightPopoverDialog");
            }

            this.getView().addDependent(oDialog);
            this._oFacilityDialog = oDialog;
            return this._oFacilityDialog;
        },

        _applyMobilePopoverDialogBehavior: function (oPopover, sStyleClass) {
            if (!sap.ui.Device.system.phone || !oPopover || !oPopover._oControl || !oPopover._oControl.setStretch) {
                return;
            }

            oPopover._oControl.setStretch(false);

            if (sStyleClass) {
                oPopover._oControl.addStyleClass(sStyleClass);
            }
        },

        _supportsFacilityChargeType: function (sSelectionMode) {
            return sSelectionMode === "PERSON_QTY";
        },
        _normalizeFacilityChargeType: function (sChargeType) {
            const sType = String(sChargeType || "").trim().toUpperCase();

            if (sType === "DAILY") {
                return "DAILY";
            }

            return "Entire Booking";
        },

        _getFacilityChargeType: function (oFacility) {
            const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);

            if (sSelectionMode !== "PERSON_QTY") {
                return "";
            }

            return this._normalizeFacilityChargeType(
                oFacility.ApiFacilityChargeType || oFacility.FacilityChargeType
            );
        },

        _getFacilityChargeTypeLabel: function (sChargeType) {
            return this._normalizeFacilityChargeType(sChargeType) === "DAILY"
                ? "Daily"
                : "Entire booking";
        },
        onFacilityDialogConfirm: function (oEvent) {
            const oDialog = this._oFacilityDialog;
            const oFacility = oDialog.data("facilityRef");
            const oSelectionModel = this.getView().getModel("FacilitySelection");

            const sSelectionMode = oSelectionModel.getProperty("/selectionMode");
            const bIsSingleOccupant = !!oSelectionModel.getProperty("/singleOccupantMode");
            const sPrimaryGuestName = oSelectionModel.getProperty("/primaryGuestName") || "Primary Guest";
            const iQuantity = Math.max(parseInt(oSelectionModel.getProperty("/quantity"), 10) || 1, 1);
            const fSelectedPrice = oSelectionModel.getProperty("/selectedPrice") || 0;
            const sSelectedPriceType = oSelectionModel.getProperty("/selectedPriceType") || "";
            const iSinglePersonQty = Math.max(parseInt(oSelectionModel.getProperty("/singlePersonQty"), 10) || 0, 0);
            const sFacilityChargeType = oSelectionModel.getProperty("/facilityChargeType") || "Entire Booking";
            const oDefaultOccupant = this._getDefaultOccupant();

            let aSelectedPersonIds = oSelectionModel.getProperty("/selectedPersonIds") || [];
            let aPersonQuantities = oSelectionModel.getProperty("/personQuantities") || [];

            aSelectedPersonIds = Array.isArray(aSelectedPersonIds) ? aSelectedPersonIds.slice() : [];

            aPersonQuantities = Array.isArray(aPersonQuantities) ? aPersonQuantities
                .filter(function (oLine) {
                    return !!oLine.selected;
                })
                .map(function (oLine) {
                    return {
                        personId: oLine.personId,
                        personName: oLine.personName,
                        qty: Math.max(parseInt(oLine.qty, 10) || 0, 0)
                    };
                }) : [];

            if (bIsSingleOccupant && sSelectionMode === "PERSON") {
                aSelectedPersonIds = [oDefaultOccupant.id];
            }

            // if (bIsSingleOccupant && sSelectionMode === "PERSON_QTY") {
            //     aSelectedPersonIds = [oDefaultOccupant.id];
            //     aPersonQuantities = [{
            //         personId: oDefaultOccupant.id,
            //         personName: oDefaultOccupant.name || sPrimaryGuestName,
            //         qty: iSinglePersonQty
            //     }];
            // }

            if (sSelectionMode === "PERSON" && aSelectedPersonIds.length === 0) {
                sap.m.MessageToast.show("Please choose at least one person.");
                return;
            }

            if (sSelectionMode === "PERSON_QTY") {
                const iFixedQty = Math.max(parseInt(oSelectionModel.getProperty("/minimumQty"), 10) || 1, 1);

                aPersonQuantities = Array.isArray(oSelectionModel.getProperty("/personQuantities"))
                    ? oSelectionModel.getProperty("/personQuantities")
                        .filter(function (oLine) {
                            return !!oLine.selected;
                        })
                        .map(function (oLine) {
                            return {
                                personId: oLine.personId,
                                personName: oLine.personName,
                                qty: iFixedQty,
                                fixedQty: iFixedQty
                            };
                        })
                    : [];

                if (aPersonQuantities.length === 0) {
                    sap.m.MessageToast.show("Please choose at least one person.");
                    return;
                }

                aSelectedPersonIds = aPersonQuantities.map(function (oLine) {
                    return oLine.personId;
                });
            }

            oFacility.Selected = true;
            oFacility.SelectedPrice = fSelectedPrice;
            oFacility.SelectedPriceType = sSelectedPriceType;
            oFacility.Quantity = iQuantity;
            oFacility.SelectionMode = sSelectionMode;
            oFacility.SelectionModeLabel = this._getFacilitySelectionModeLabel(sSelectionMode);
            oFacility.FacilityChargeType = this._supportsFacilityChargeType(sSelectionMode) ? sFacilityChargeType : "";
            oFacility.SelectedPersonIds = aSelectedPersonIds.slice();
            oFacility.PersonQuantities = aPersonQuantities;

            this._setFacilitySelectionSummary(oFacility);

            this.getView().getModel("FacilityModel").refresh(true);
            this._renderFacilityCards();
            this._rebuildSelectedFacilities();
            this._refreshCouponAndSummary({ checkDateWindow: false });

            oDialog.close();
        },


        _setFacilitySelectedPrice: function (oFacility, sSelectedType, fSelectedPrice, iQuantity, aSelectedPersonIds, aPersonQuantities) {
            oFacility.Selected = true;
            oFacility.SelectedPrice = fSelectedPrice;
            oFacility.SelectedPriceType = sSelectedType;
            oFacility.Quantity = iQuantity || 1;
            oFacility.SelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            oFacility.SelectionModeLabel = this._getFacilitySelectionModeLabel(oFacility.SelectionMode);
            oFacility.FacilityChargeType = this._getFacilityChargeType(oFacility);
            oFacility.SelectedPersonIds = Array.isArray(aSelectedPersonIds) ? aSelectedPersonIds.slice() : [];
            oFacility.PersonQuantities = Array.isArray(aPersonQuantities)
                ? aPersonQuantities.map(function (oLine) {
                    return {
                        personId: oLine.personId,
                        personName: oLine.personName,
                        qty: Math.max(parseInt(oLine.qty, 10) || 0, 0)
                    };
                })
                : [];

            this._setFacilitySelectionSummary(oFacility);

            this.getView().getModel("FacilityModel").refresh(true);
            this._renderFacilityCards();
            this._rebuildSelectedFacilities();
            this._refreshCouponAndSummary({ checkDateWindow: false });
        },




        onFacilityDialogRemove: function (oEvent) {
            const oDialog = this._oFacilityDialog;
            const oFacility = oDialog.data("facilityRef");

            oFacility.Selected = false;
            oFacility.SelectedPrice = 0;
            oFacility.SelectedPriceType = "";
            oFacility.Quantity = 1;
            oFacility.FacilityChargeType = "Entire Booking";
            oFacility.SelectedPersonIds = [];
            oFacility.PersonQuantities = [];
            oFacility.SelectionSummary = "";

            this.getView().getModel("FacilityModel").refresh(true);
            this._renderFacilityCards();
            this._rebuildSelectedFacilities();
            this._refreshCouponAndSummary({ checkDateWindow: false });
            oDialog.close();
        },

        _clearSelectedFacilities: function () {
            (this._aAllFacilities || []).forEach(function (oFacility) {
                oFacility.Selected = false;
                oFacility.SelectedPrice = 0;
                oFacility.SelectedPriceType = "";
                oFacility.Quantity = 1;
                oFacility.FacilityChargeType = "Entire Booking";
                oFacility.SelectedPersonIds = [];
                oFacility.PersonQuantities = [];
                oFacility.SelectionSummary = "";
            });

            this.getView().getModel("HostelModel").setProperty("/AllSelectedFacilities", []);
            this.getView().getModel("HostelModel").setProperty("/TotalFacilityPrice", 0);
            this._renderFacilityCards();
        },


            _rebuildSelectedFacilities: function () {
                const oModel = this.getView().getModel("HostelModel");
                const oFacilityModel = this.getView().getModel("FacilityModel");
                const oUnits = this._getBookingUnits();

                const aOccupants = this._getOccupantOptions ? this._getOccupantOptions() : [];

                const fnGetPersonName = function (sPersonId) {
                    const oFound = aOccupants.find(function (oPerson) {
                        return oPerson.id === sPersonId;
                    });
                    return oFound ? oFound.name : sPersonId;
                };

                const fnGetPeriodMultiplier = function (sPriceType) {
                    if (sPriceType === "Per Day") {
                        return oUnits.days || 1;
                    }
                    if (sPriceType === "Per Month") {
                        return oUnits.months || 1;
                    }
                    if (sPriceType === "Per Year") {
                        return oUnits.years || 1;
                    }
                    if (sPriceType === "Unit Price") {
                        return 1;
                    }
                    return 1;
                };

                const aSelectedFacilities = (this._aAllFacilities || [])
                    .filter(function (oFacility) {
                        return !!oFacility.Selected;
                    })
                    .map(function (oFacility) {
                        const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                        const fPrice = this._toNumber(oFacility.SelectedPrice || oFacility.CurrentPrice || oFacility.UnitPrice);
                        const sPriceType = oFacility.SelectedPriceType || oFacility.CurrentPriceType || "Unit Price";
                        const sCurrency = oFacility.Currency || "INR";
                        const fPeriodMultiplier = fnGetPeriodMultiplier(sPriceType);
                        const sFacilityChargeType = this._getFacilityChargeType(oFacility);
                        const iChargeableDayCount = this._getFacilityChargeableDayCount();
                        const aSelectedPersonIds = Array.isArray(oFacility.SelectedPersonIds) ? oFacility.SelectedPersonIds : [];
                        const aPersonQuantities = Array.isArray(oFacility.PersonQuantities) ? oFacility.PersonQuantities : [];

                        let fTotal = 0;
                        let sBreakdown = "";
                        let sAllocationDetails = "";

                        if (sSelectionMode === "SINGLE") {
                            fTotal = fPrice * fPeriodMultiplier;
                            sBreakdown = "Room (1) x " + fPeriodMultiplier + " " + sPriceType;
                            sAllocationDetails = JSON.stringify({
                                selectionMode: sSelectionMode,
                                roomCount: 1
                            });
                        } else if (sSelectionMode === "QTY") {
                            const iQty = Math.max(parseInt(oFacility.Quantity, 10) || 1, 1);
                            fTotal = fPrice * fPeriodMultiplier * iQty;
                            sBreakdown = "Qty (" + iQty + ") x " + fPeriodMultiplier + " " + sPriceType;
                            sAllocationDetails = JSON.stringify({
                                selectionMode: sSelectionMode,
                                quantity: iQty
                            });
                        } else if (sSelectionMode === "PERSON") {
                            const aNames = aSelectedPersonIds.map(function (sPersonId) {
                                return fnGetPersonName(sPersonId);
                            });
                            const iPersonCount = aSelectedPersonIds.length;

                            fTotal = fPrice * fPeriodMultiplier * iPersonCount;
                            sBreakdown = "For: " + aNames.join(", ") + " x " + fPeriodMultiplier + " " + sPriceType;
                            sAllocationDetails = JSON.stringify({
                                selectionMode: sSelectionMode,
                                selectedPersons: aSelectedPersonIds.map(function (sPersonId) {
                                    return {
                                        personId: sPersonId,
                                        personName: fnGetPersonName(sPersonId)
                                    };
                                })
                            });
                        } else if (sSelectionMode === "PERSON_QTY") {
                            const aValidLines = aPersonQuantities.filter(function (oLine) {
                                return (parseInt(oLine.qty, 10) || 0) > 0;
                            });

                            const iSelectedPersonCount = aValidLines.length;

                            const fPackagePrice = this._toNumber(
                                oFacility.MinimumPrice || oFacility.SelectedPrice || oFacility.CurrentPrice
                            );

                            const aNames = aValidLines.map(function (oLine) {
                                return oLine.personName || fnGetPersonName(oLine.personId);
                            });

                            if (sFacilityChargeType === "DAILY") {
                                fTotal = fPackagePrice * iSelectedPersonCount * iChargeableDayCount;
                                sBreakdown = "For: " + aNames.join(", ") +
                                    " | Daily x " + iChargeableDayCount + " day(s)";
                            } else {
                                fTotal = fPackagePrice * iSelectedPersonCount;
                                sBreakdown = "For: " + aNames.join(", ") +
                                    " | Once per booking";
                            }

                            sAllocationDetails = JSON.stringify({
                                selectionMode: sSelectionMode,
                                facilityChargeType: sFacilityChargeType,
                                chargeableDays: sFacilityChargeType === "DAILY" ? iChargeableDayCount : 0,
                                selectedPersons: aValidLines.map(function (oLine) {
                                    return {
                                        personId: oLine.personId,
                                        personName: oLine.personName || fnGetPersonName(oLine.personId),
                                        quantity: parseInt(oLine.qty, 10) || 0
                                    };
                                })
                            });
                        } else {
                            fTotal = fPrice * fPeriodMultiplier;
                            sBreakdown = "x " + fPeriodMultiplier + " " + sPriceType;
                            sAllocationDetails = JSON.stringify({
                                selectionMode: "SINGLE",
                                roomCount: 1
                            });
                        }

                        return {
                            FacilityID: oFacility.FacilityID,
                            CatalogFacilityID: oFacility.CatalogFacilityID || oFacility.ID,
                            FacilityName: oFacility.FacilityName,
                            DisplayFacilityName: oFacility.DisplayFacilityName || oFacility.FacilityName,
                            Currency: sCurrency,
                            SelectionMode: sSelectionMode,
                            Price: fPrice,
                            UnitText: sPriceType,
                            FacilityChargeType: sFacilityChargeType,
                            Quantity: Math.max(parseInt(oFacility.Quantity, 10) || 1, 1),
                            SelectedPersonIds: aSelectedPersonIds.slice(),
                            PersonQuantities: aPersonQuantities.map(function (oLine) {
                                return {
                                    personId: oLine.personId,
                                    personName: oLine.personName || fnGetPersonName(oLine.personId),
                                    qty: Math.max(parseInt(oLine.qty, 10) || 0, 0)
                                };
                            }),
                            // Minimum package fields for PERSON_QTY facilities
                            MinimumQty: parseInt(oFacility.MinimumQty, 10) || 0,
                            MinimumPrice: parseFloat(oFacility.MinimumPrice) || 0,
                            AllocationDetails: sAllocationDetails,
                            RateText: sSelectionMode === "PERSON_QTY"
                                ? this._formatFacilityPriceWithUnit(
                                    this._toNumber(oFacility.MinimumPrice),
                                    sCurrency,
                                    "Package Price"
                                )
                                : this._formatFacilityPriceWithUnit(fPrice, sCurrency, sPriceType),
                            TotalAmount: Number(fTotal.toFixed(2)),
                            BreakdownText: sBreakdown,
                            RawFacilityItems: Array.isArray(oFacility.RawFacilityItems)
                                ? oFacility.RawFacilityItems.map(function (oItem) {
                                    return Object.assign({}, oItem);
                                })
                                : []
                        };
                    }.bind(this));
                oModel.setProperty("/AllSelectedFacilities", aSelectedFacilities);
                oModel.setProperty("/FacilityDiscounts", []);
                oModel.setProperty("/TotalFacilityDiscount", 0);
                oModel.setProperty("/HasFacilityOfferDiscount", false);
                oModel.setProperty("/HasValidFacilityOffer", false);
                oModel.setProperty(
                    "/TotalFacilityPrice",
                    Number(
                        aSelectedFacilities.reduce(function (sum, oItem) {
                            return sum + (this._toNumber(oItem.TotalAmount));
                        }.bind(this), 0).toFixed(2)
                    )
                );

                if (oFacilityModel) {
                    oFacilityModel.refresh(true);
                }

                this._renderFacilityCards();
                },
            // Calculate discounts for PERSON_QTY facilities with valid minimum offer
            // const aFacilityDiscounts = [];
            // let fTotalDiscount = 0;
            // let bHasValidFacilityOfferDiscount = false;
            // let bHasValidFacilityOffer = false;

            // aSelectedFacilities.forEach(function (oFacility) {
            //     // Check if this is a PERSON_QTY facility with valid minimum offer
            //     const bIsValidOffer = oFacility.SelectionMode === "PERSON_QTY" &&
            //         oFacility.MinimumQty > 0 &&
            //         oFacility.MinimumPrice >= 0;

            //     if (bIsValidOffer) {
            //         bHasValidFacilityOffer = true;

            //         const iTotalQty = oFacility.PersonQuantities.reduce(function (iSum, oLine) {
            //             return iSum + (oLine.qty || 0);
            //         }, 0);

            //         if (iTotalQty > 0) {
            //             // Calculate normal offer price: first MinimumQty units at Price
            //             // The offer applies once for the entire booking regardless of charge type
            //             const iMinQty = Math.min(iTotalQty, oFacility.MinimumQty);
            //             const fNormalOfferPrice = iMinQty * oFacility.Price;

            //             // Calculate discount amount (can be positive when MinimumPrice < normal price)
            //             const fDiscountAmount = Math.max(fNormalOfferPrice - oFacility.MinimumPrice, 0);

            //             if (fDiscountAmount > 0 || oFacility.MinimumPrice === 0) {
            //                 // Discount is calculated once for the entire booking
            //                 // NOT multiplied by days even for DAILY charge type
            //                 const fAdjustedDiscount = fDiscountAmount;

            //                 // Create discount entry even if discount amount is 0 (for MinimumPrice = 0 case)
            //                 // This ensures we track that there's a valid offer
            //                 aFacilityDiscounts.push({
            //                     FacilityName: oFacility.FacilityName,
            //                     MinimumQty: oFacility.MinimumQty,
            //                     MinimumPrice: oFacility.MinimumPrice,
            //                     DiscountAmount: Number(fAdjustedDiscount.toFixed(2)),
            //                     DisplayText: "Offer Discount - " + oFacility.FacilityName + ": first " +
            //                         oFacility.MinimumQty + " units at ₹" + oFacility.MinimumPrice.toFixed(0) +
            //                         " (applied once per booking)",
            //                     HasDiscount: fAdjustedDiscount > 0
            //                 });

            //                 fTotalDiscount += fAdjustedDiscount;
            //                 if (fAdjustedDiscount > 0) {
            //                     bHasValidFacilityOfferDiscount = true;
            //                 }
            //             }
            //         }
            //     }
            // }.bind(this));

            // oModel.setProperty("/AllSelectedFacilities", aSelectedFacilities);
            // oModel.setProperty("/FacilityDiscounts", aFacilityDiscounts);
            // oModel.setProperty("/TotalFacilityDiscount", Number(fTotalDiscount.toFixed(2)));
            // oModel.setProperty("/HasFacilityOfferDiscount", bHasValidFacilityOfferDiscount);
            // oModel.setProperty("/HasValidFacilityOffer", bHasValidFacilityOffer);

            // // Attach hover for discount info icon if needed
            // if (bHasValidFacilityOffer) {
            //     setTimeout(function () {
            //         this._attachFacilityDiscountInfoHover();
            //     }.bind(this), 100);
            // }
            // oModel.setProperty(
            //     "/TotalFacilityPrice",
            //     Number(
            //         aSelectedFacilities.reduce(function (sum, oItem) {
            //             return sum + (this._toNumber(oItem.TotalAmount));
            //         }.bind(this), 0).toFixed(2)
            //     )
            // );
        // },


        _getFacilityMultiplierLabel: function (sSelectedPriceType, oUnits) {
            if (sSelectedPriceType === "Per Day") {
                return oUnits.days + " day(s)";
            }
            if (sSelectedPriceType === "Per Month") {
                return (oUnits.months || 1) + " month(s)";
            }
            if (sSelectedPriceType === "Per Year") {
                return (oUnits.years || 1) + " year(s)";
            }
            return "1 unit";
        },

        // _buildFacilityPriceOptions: function (oFacility) {
        //     const aOptions = [];
        //     const bIsUnitBasedFacility = this._isUnitBasedFacility(oFacility);

        //     if (bIsUnitBasedFacility && this._toNumber(oFacility.UnitPrice) > 0) {
        //         aOptions.push({
        //             key: "Unit Price",
        //             text: "Unit Price - " + this._toNumber(oFacility.UnitPrice) + " " + oFacility.Currency,
        //             price: this._toNumber(oFacility.UnitPrice)
        //         });

        //         return aOptions;
        //     }

        //     if (this._toNumber(oFacility.PricePerDay) > 0) {
        //         aOptions.push({
        //             key: "Per Day",
        //             text: "Per Day - " + this._toNumber(oFacility.PricePerDay) + " " + oFacility.Currency,
        //             price: this._toNumber(oFacility.PricePerDay)
        //         });
        //     }

        //     if (this._toNumber(oFacility.PricePerMonth) > 0) {
        //         aOptions.push({
        //             key: "Per Month",
        //             text: "Per Month - " + this._toNumber(oFacility.PricePerMonth) + " " + oFacility.Currency,
        //             price: this._toNumber(oFacility.PricePerMonth)
        //         });
        //     }

        //     if (this._toNumber(oFacility.PricePerYear) > 0) {
        //         aOptions.push({
        //             key: "Per Year",
        //             text: "Per Year - " + this._toNumber(oFacility.PricePerYear) + " " + oFacility.Currency,
        //             price: this._toNumber(oFacility.PricePerYear)
        //         });
        //     }

        //     return aOptions;
        // },

        _buildFacilityPriceOptions: function (oFacility) {
            const aOptions = [];
            const sSelectionMode = this._getFacilitySelectionMode(oFacility);

            const fUnitPrice = this._toNumber(oFacility.UnitPrice);
            const fMinimumPrice = this._toNumber(oFacility.MinimumPrice);
            const fPerHour = this._toNumber(oFacility.PricePerHour);
            const fPerDay = this._toNumber(oFacility.PricePerDay);
            const fPerMonth = this._toNumber(oFacility.PricePerMonth);
            const fPerYear = this._toNumber(oFacility.PricePerYear);

            function addOption(sKey, sLabel, fPrice) {
                if (fPrice > 0) {
                    aOptions.push({
                        key: sKey,
                        text: sLabel + " - " + fPrice + " " + (oFacility.Currency || "INR"),
                        price: fPrice
                    });
                }
            }

            if (sSelectionMode === "PERSON_QTY") {
                if (fMinimumPrice > 0) {
                    addOption("Package Price", "Package Price", fMinimumPrice);
                }

                return aOptions;
            }

            addOption("Unit Price", "Unit Price", fUnitPrice);
            addOption("Per Hour", "Per Hour", fPerHour);
            addOption("Per Day", "Per Day", fPerDay);
            addOption("Per Month", "Per Month", fPerMonth);
            addOption("Per Year", "Per Year", fPerYear);

            return aOptions;
        },

        _createMemberDraft: function () {
            return {
                id: "FM_" + Date.now(),
                MemberID: "",
                Salutation: "",
                Name: "",
                Relation: "",
                Age: "",
                Gender: "",
                Selected: false,
                IsPrimary: false,
                DocumentType: "",
                DocumentName: "",
                Document: "",
                File: "",
                FileType: "",
                DocumentID: "",
                DocumentFile: null,
                Documents: [],
                PendingDeletedDocumentIDs: [],
                IsEditMode: false
            };
        },

        _bufferToBase64: function (oFileBuffer) {
            if (!(oFileBuffer && typeof oFileBuffer === "object" && oFileBuffer.type === "Buffer" && Array.isArray(oFileBuffer.data))) {
                return oFileBuffer || "";
            }

            try {
                const aBytes = oFileBuffer.data;
                const iChunkSize = 0x8000;
                let sBinary = "";

                for (let i = 0; i < aBytes.length; i += iChunkSize) {
                    const aChunk = aBytes.slice(i, i + iChunkSize);
                    sBinary += String.fromCharCode.apply(null, aChunk);
                }

                return btoa(sBinary);
            } catch (e) {
                console.warn("[_bufferToBase64] Failed to convert Buffer to base64:", e);
                return "";
            }
        },

        _normalizeMemberRecord: function (oMember, iIndex) {
            const oMemberDocument = Array.isArray(oMember && oMember.Documents) && oMember.Documents.length > 0 ? oMember.Documents[0] : {};
            const aDocuments = Array.isArray(oMember && oMember.Documents) ? oMember.Documents.map(function (oDocument) {
                // Handle Buffer object for File field
                const sFile = this._bufferToBase64(oDocument.File || "");
                return Object.assign({}, oDocument, { File: sFile });
            }.bind(this)) : [];

            // Extract document fields from first document
            let sDocumentType = oMember.DocumentType || oMemberDocument.DocumentType || "";
            let sDocumentName = oMember.DocumentName || oMember.FileName || oMemberDocument.FileName || "";
            let sFile = oMember.File || oMember.Document || oMemberDocument.File || "";
            let sFileType = oMember.FileType || oMemberDocument.FileType || "";
            let sDocumentID = oMember.DocumentID || oMemberDocument.DocumentID || "";

            // Handle Buffer object for File field
            sFile = this._bufferToBase64(sFile);

            // Determine if this member is a Self member (case-insensitive)
            const sRelationRaw = oMember.Relation || "";
            const bIsSelfRelation = String(sRelationRaw).trim().toLowerCase() === "self";
            const bIsSelfId = oMember.id === "SELF";

            // Normalize relation: if relation is "self" (any case) or id is SELF, set to "Self"
            const sNormalizedRelation = bIsSelfRelation || bIsSelfId ? "Self" : (oMember.Relation || (oMember.id === "SELF" ? "Self" : "Other"));

            // If member is a Self member, force id to "SELF" to ensure merging
            let sId = oMember.id || oMember.MemberID || oMember.ID || ("FM_UI_" + (Date.now() + iIndex));
            if (bIsSelfRelation && sId !== "SELF") {
                sId = "SELF";
            }

            return {
                id: sId,
                MemberID: oMember.MemberID || oMember.ID || "",
                Salutation: oMember.Salutation || "",
                Name: oMember.Name || oMember.FullName || "",
                Relation: sNormalizedRelation,
                Age: oMember.Age || oMember.DateOfBirth || oMember.DateofBirth || "",
                Gender: oMember.Gender || "",
                Selected: !!oMember.Selected,
                DocumentType: sDocumentType,
                DocumentName: sDocumentName,
                Document: sFile,
                File: sFile,
                FileType: sFileType,
                DocumentID: sDocumentID,
                DocumentFile: null,
                Documents: aDocuments,
                PendingDeletedDocumentIDs: Array.isArray(oMember.PendingDeletedDocumentIDs) ? oMember.PendingDeletedDocumentIDs.slice() : [],
                IsPrimary: !!oMember.IsPrimary
            };
        },

        _memberHasUploadedDocument: function (oMember) {
            const sDocumentName = String(oMember && (oMember.DocumentName || oMember.FileName) || "").trim();
            const sDocumentFile = String(oMember && (oMember.Document || oMember.File) || "").trim();

            return !!(sDocumentName && sDocumentFile);
        },

        canEditMemberFromDialog: function (bIsPrimary, sDocumentName, sDocument, sFile) {
            // Allow editing even if document is uploaded (requirement changed)
            return true;
        },

        _getPrimaryDocumentRecord: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const aMemberList = Array.isArray(oHostelModel && oHostelModel.getProperty("/MemberList")) ?
                oHostelModel.getProperty("/MemberList") : [];
            const oSelfMember = aMemberList.find(function (oMember) {
                return String(oMember && oMember.Relation || "").trim().toLowerCase() === "self";
            }) || {};
            const aDocumentSources = Array.isArray(oSelfMember.Documents) ? oSelfMember.Documents : [];

            for (let i = 0; i < aDocumentSources.length; i += 1) {
                let oDocument = aDocumentSources[i];
                if (!oDocument) {
                    continue;
                }

                let sFile = this._bufferToBase64(oDocument.File || oDocument.Document || "");

                if (sFile !== (oDocument.File || oDocument.Document || "")) {
                    oDocument = Object.assign({}, oDocument, {
                        File: sFile,
                        Document: sFile
                    });
                }

                if (String(sFile || "").trim()) {
                    return oDocument;
                }
            }

            return {};
        },
        _getPrimaryMemberRecord: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const aMemberList = Array.isArray(oHostelModel.getProperty("/MemberList")) ? oHostelModel.getProperty("/MemberList") : [];

            // Try to find a member with Relation "Self" (case-insensitive) in MemberList (from HM_MemberDocuments)
            let oSelfMember = null;
            for (let i = 0; i < aMemberList.length; i++) {
                const oMember = aMemberList[i];
                const sRelation = String(oMember.Relation || "").trim().toLowerCase();
                if (sRelation === "self") {
                    oSelfMember = oMember;
                    break;
                }
            }

            let sName = "";
            let sSalutation = "";
            let sGender = "";
            let sAgeOrDOB = "";

            if (oSelfMember) {
                // Use the member's details from HM_MemberDocuments
                sName = String(oSelfMember.Name || oSelfMember.FullName || "").trim();
                sSalutation = String(oSelfMember.Salutation || "").trim();
                sGender = String(oSelfMember.Gender || "").trim();
                sAgeOrDOB = String(oSelfMember.Age || oSelfMember.DateOfBirth || oSelfMember.DateofBirth || "").trim();
            } else {
                // Fallback to HostelModel properties (from LoginModel)
                sName = String(oHostelModel.getProperty("/FullName") || "").trim();
                sSalutation = oHostelModel.getProperty("/Salutation") || "";
                sGender = oHostelModel.getProperty("/Gender") || "";
                sAgeOrDOB = String(oHostelModel.getProperty("/DateOfBirth") || "").trim();
            }

            const oPrimaryDocument = this._getPrimaryDocumentRecord();
            return {
                id: "SELF",
                MemberID: oSelfMember && oSelfMember.MemberID || oHostelModel.getProperty("/UserID") || "",
                Salutation: sSalutation,
                Name: sName || "Primary Guest",
                Relation: "Self",
                Age: sAgeOrDOB,
                Gender: sGender,
                Selected: false,
                DocumentType: oPrimaryDocument.DocumentType || "",
                DocumentName: oPrimaryDocument.DocumentName || oPrimaryDocument.FileName || "",
                Document: oPrimaryDocument.Document || oPrimaryDocument.File || "",
                File: oPrimaryDocument.File || oPrimaryDocument.Document || "",
                FileType: oPrimaryDocument.FileType || "",
                DocumentID: oPrimaryDocument.DocumentID || "",
                DocumentFile: null,
                IsPrimary: true
            };
        },

        _syncPrimaryMemberInFamilyMembers: function () {
            const oBookingView = this.getView().getModel("BookingView");

            if (!oBookingView) {
                return;
            }

            // Get current selected members
            const aSelectedMembers = (oBookingView.getProperty("/FamilyMembers") || []).map(function (oMember, iIndex) {
                return this._normalizeMemberRecord(oMember || {}, iIndex);
            }.bind(this));

            // Track previous primary for toast notification
            const sPreviousPrimaryId = this._sLastPrimaryMemberId;
            let sNewPrimaryId = null;
            let sNewPrimaryName = null;

            // Check if logged-in user (SELF) is selected
            const bSelfSelected = aSelectedMembers.some(function (oMember) {
                return oMember.id === "SELF";
            });

            // Find if there's already a manually selected primary
            const aExistingPrimaries = aSelectedMembers.filter(function (oMember) {
                return oMember.IsPrimary === true;
            });

            let bHasManualPrimary = aExistingPrimaries.length > 0;
            let oExistingPrimary = aExistingPrimaries[0];

            // Update all selected members with correct IsPrimary flag
            const aUpdatedSelectedMembers = aSelectedMembers.map(function (oMember, iIndex) {
                let bIsPrimary = false;

                if (bHasManualPrimary) {
                    // Respect manual selection: this member is primary only if it's the existing primary
                    bIsPrimary = oMember.id === oExistingPrimary.id;
                } else {
                    // No manual primary selected, apply automatic rules (same as before for backward compatibility)
                    if (bSelfSelected) {
                        // If SELF is selected, SELF is primary
                        bIsPrimary = oMember.id === "SELF";
                    } else if (aSelectedMembers.length > 0) {
                        // If SELF is not selected, first selected member is primary
                        bIsPrimary = iIndex === 0;
                    }
                }

                if (bIsPrimary) {
                    sNewPrimaryId = oMember.id;
                    sNewPrimaryName = (oMember.Salutation ? oMember.Salutation + " " : "") + (oMember.Name || "");
                }

                return Object.assign({}, oMember, {
                    IsPrimary: bIsPrimary
                });
            });

            // If SELF is selected but not in the list (shouldn't happen), add it
            if (bSelfSelected && !aUpdatedSelectedMembers.some(function (oMember) {
                return oMember.id === "SELF";
            })) {
                const oPrimaryMember = this._getPrimaryMemberRecord();
                oPrimaryMember.Selected = true;
                oPrimaryMember.IsPrimary = true;
                sNewPrimaryId = oPrimaryMember.id;
                sNewPrimaryName = (oPrimaryMember.Salutation ? oPrimaryMember.Salutation + " " : "") + (oPrimaryMember.Name || "");
                aUpdatedSelectedMembers.unshift(oPrimaryMember);
            }

            // Sort selected members with primary first (for main booking table)
            aUpdatedSelectedMembers.sort(function (oLeft, oRight) {
                if (oLeft.IsPrimary) {
                    return -1;
                }
                if (oRight.IsPrimary) {
                    return 1;
                }
                return 0;
            });

            // Update MasterMembers (all available members including non-selected)
            // Preserve original order of MasterMembers, just update IsPrimary flags
            const aCurrentMasterMembers = oBookingView.getProperty("/MasterMembers") || [];

            // Update each member in MasterMembers
            const aUpdatedMasterMembers = aCurrentMasterMembers.map(function (oMember) {
                const oNormalized = this._normalizeMemberRecord(oMember);

                // Check if this member is the primary in selected members
                const oPrimaryInSelected = aUpdatedSelectedMembers.find(function (oSelected) {
                    return oSelected.id === oNormalized.id && oSelected.IsPrimary;
                });

                if (oNormalized.id === "SELF") {
                    // Update SELF member - preserve existing properties but update Selected and IsPrimary
                    const oSelfMember = this._getPrimaryMemberRecord();
                    // Merge: existing member properties, then SELF template, then updated flags
                    // But preserve document fields from normalized member
                    const oMerged = Object.assign({}, oNormalized, oSelfMember, {
                        Selected: bSelfSelected,
                        IsPrimary: bSelfSelected
                    });
                    // Ensure document fields from normalized member are preserved
                    // (they might be overridden by oSelfMember if oSelfMember has empty document fields)
                    if (oNormalized.DocumentName || oNormalized.Document || oNormalized.File) {
                        oMerged.DocumentName = oNormalized.DocumentName;
                        oMerged.Document = oNormalized.Document;
                        oMerged.File = oNormalized.File;
                        oMerged.FileType = oNormalized.FileType;
                        oMerged.DocumentType = oNormalized.DocumentType;
                        oMerged.DocumentID = oNormalized.DocumentID;
                    }
                    return oMerged;
                } else if (oPrimaryInSelected) {
                    // This member is primary in selected list
                    return Object.assign({}, oNormalized, {
                        IsPrimary: true,
                        Selected: true
                    });
                } else {
                    // Not primary, keep original selection state
                    const bIsSelected = aUpdatedSelectedMembers.some(function (oSelected) {
                        return oSelected.id === oNormalized.id;
                    });
                    return Object.assign({}, oNormalized, {
                        IsPrimary: false,
                        Selected: bIsSelected
                    });
                }
            }.bind(this));

            // Ensure SELF exists in MasterMembers (add if missing)
            const bHasSelf = aUpdatedMasterMembers.some(function (oMember) {
                return oMember.id === "SELF";
            });
            let aFinalMasterMembers = aUpdatedMasterMembers;
            if (!bHasSelf) {
                const oSelfMember = this._getPrimaryMemberRecord();
                oSelfMember.Selected = bSelfSelected;
                oSelfMember.IsPrimary = bSelfSelected;
                aFinalMasterMembers = [oSelfMember].concat(aFinalMasterMembers);
            }

            // Ensure SELF is at the top of MasterMembers without sorting other members
            const iSelfIndex = aFinalMasterMembers.findIndex(function (oMember) {
                return oMember.id === "SELF";
            });
            if (iSelfIndex > 0) {
                // Remove SELF from its current position and insert at beginning
                const [oSelf] = aFinalMasterMembers.splice(iSelfIndex, 1);
                aFinalMasterMembers.unshift(oSelf);
            }

            oBookingView.setProperty("/MasterMembers", aFinalMasterMembers);
            oBookingView.setProperty("/FamilyMembers", aUpdatedSelectedMembers);

            // Show toast if primary changed from logged-in user to another person
            if (sPreviousPrimaryId === "SELF" && sNewPrimaryId && sNewPrimaryId !== "SELF" && sNewPrimaryName) {
                MessageToast.show("Primary occupant changed to " + sNewPrimaryName + ". Booking will be created under this name.");
            }

            // Store current primary for next comparison
            this._sLastPrimaryMemberId = sNewPrimaryId;
        },

        _mergeMembersById: function (aMembers) {
            const oMap = {};

            (aMembers || []).forEach(function (oMember, iIndex) {
                const oNormalized = this._normalizeMemberRecord(oMember || {}, iIndex);
                oMap[oNormalized.id] = Object.assign({}, oMap[oNormalized.id] || {}, oNormalized);
            }.bind(this));

            return Object.keys(oMap).map(function (sKey) {
                return oMap[sKey];
            });
        },

        _syncMemberDialogSelections: function () {
            const oTable = this.byId("memberSelectTable");
            const oBookingView = this.getView().getModel("BookingView");

            if (!oTable || !oBookingView) {
                return;
            }

            const aSelectedIds = new Set((oBookingView.getProperty("/FamilyMembers") || []).map(function (oMember) {
                return oMember.id;
            }));

            oTable.removeSelections(true);
            oTable.getItems().forEach(function (oItem) {
                const oCtx = oItem.getBindingContext("BookingView");

                if (oCtx && aSelectedIds.has(oCtx.getProperty("id"))) {
                    oTable.setSelectedItem(oItem, true);
                }
            });
        },

        // _loadMasterMembersForDialog: function () {
        //     const oBookingView = this.getView().getModel("BookingView");
        //     const oHostelModel = this.getView().getModel("HostelModel");
        //     const aMasterMembers = oBookingView.getProperty("/MasterMembers") || [];
        //     const aServerMemberList = Array.isArray(oHostelModel.getProperty("/MemberList")) ? oHostelModel.getProperty("/MemberList") : [];
        //     const aSelectedMembers = oBookingView.getProperty("/FamilyMembers") || [];
        //     const aCombined = this._mergeMembersById([].concat(aMasterMembers, aServerMemberList, aSelectedMembers));

        //     oBookingView.setProperty("/MasterMembers", aCombined);
        //     this._syncPrimaryMemberInFamilyMembers();
        //     oBookingView.refresh(true);
        // },
        _loadMasterMembersForDialog: function () {
            const oBookingView = this.getView().getModel("BookingView");
            const oHostelModel = this.getView().getModel("HostelModel");
            let aMasterMembers = oBookingView.getProperty("/MasterMembers") || [];
            let aServerMemberList = Array.isArray(oHostelModel.getProperty("/MemberList"))
                ? oHostelModel.getProperty("/MemberList") : [];
            let aSelectedMembers = oBookingView.getProperty("/FamilyMembers") || [];

            // Helper to check if a member is a Self member (case-insensitive)
            function isSelfMember(oMember) {
                const sRelation = String(oMember.Relation || "").trim().toLowerCase();
                return sRelation === "self";
            }

            // Before filtering, capture selection state from any existing Self members
            let bSelfSelected = false;
            let bSelfIsPrimary = false;

            // Check all arrays for Self members and capture their flags
            const allArrays = [aMasterMembers, aServerMemberList, aSelectedMembers];
            allArrays.forEach(arr => {
                arr.forEach(oMember => {
                    if (isSelfMember(oMember)) {
                        bSelfSelected = bSelfSelected || oMember.Selected === true;
                        bSelfIsPrimary = bSelfIsPrimary || oMember.IsPrimary === true;
                    }
                });
            });

            // Filter out any member with Relation "Self" from all lists to avoid duplication
            // because we will inject a fresh SELF record based on HM_MemberDocuments
            aMasterMembers = aMasterMembers.filter(function (oMember) {
                return !isSelfMember(oMember);
            });
            aServerMemberList = aServerMemberList.filter(function (oMember) {
                return !isSelfMember(oMember);
            });
            aSelectedMembers = aSelectedMembers.filter(function (oMember) {
                return !isSelfMember(oMember);
            });

            // ✅ Always inject a fresh SELF record first — guarantees logged-in user
            // is always present in the dialog table regardless of prior state or timing.
            const oSelfRecord = this._getPrimaryMemberRecord();

            // Apply captured selection state to the fresh SELF record
            oSelfRecord.Selected = bSelfSelected;
            oSelfRecord.IsPrimary = bSelfIsPrimary;

            const aCombined = this._mergeMembersById(
                [oSelfRecord].concat(aMasterMembers, aServerMemberList, aSelectedMembers)
            );

            oBookingView.setProperty("/MasterMembers", aCombined);
            this._syncPrimaryMemberInFamilyMembers();
            oBookingView.refresh(true);
        },

        _getMemberSelectionDialog: function () {
            if (!this._pMemberSelectionDialog) {
                this._pMemberSelectionDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.ui.com.project1.fragment.MemberSelectDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            return this._pMemberSelectionDialog;
        },

        _getNewMemberDialog: function () {
            if (!this._pNewMemberDialog) {
                this._pNewMemberDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.ui.com.project1.fragment.NewMemberDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);

                    if (sap.ui.Device.system.phone) {
                        oDialog.setStretch(false);
                        oDialog.setContentHeight("auto");
                        oDialog.addStyleClass("mobileAutoHeightPopoverDialog");
                    }

                    return oDialog;
                }.bind(this));
            }

            return this._pNewMemberDialog;
        },

        // onAddFamilyMember: function () {
        //     this.onMemberValueHelpRequest();
        // },

        onMemberValueHelpRequest: async function () {
            // Check if booking dates are selected
            const oHostelModel = this.getView().getModel("HostelModel");
            const sStartDate = oHostelModel?.getProperty("/StartDate") || "";
            const sEndDate = oHostelModel?.getProperty("/EndDate") || "";

            if (!String(sStartDate).trim() || !String(sEndDate).trim()) {
                sap.m.MessageToast.show("Please select start date and end date from booking details before selecting occupants.");
                return;
            }

            // Check if member data is already loaded
            if (this._bMemberDataLoaded === true) {
            // Data is ready, proceed immediately
                this._loadMasterMembersForDialog();
                const oDialog = await this._getMemberSelectionDialog();
                oDialog.open();
                // ✅ Defer sync until after the dialog's table renders
                setTimeout(function () {
                    this._syncMemberDialogSelections();
                }.bind(this), 0);
            } else {
                // Show busy dialog from BaseController and wait for data to load
                this.getBusyDialog();

                // Wait for data to be loaded (polls indefinitely until _bMemberDataLoaded becomes true)
                const waitForData = () => {
                    if (this._bMemberDataLoaded === true) {
                        this.closeBusyDialog();
                        // Data is now ready, proceed with opening dialog
                        this._loadMasterMembersForDialog();
                        this._getMemberSelectionDialog().then(oDialog => {
                            oDialog.open();
                            setTimeout(function () {
                                this._syncMemberDialogSelections();
                            }.bind(this), 0);
                        });
                    } else {
                        // Check again after a short delay
                        setTimeout(waitForData, 100);
                    }
                };

                // Start waiting
                waitForData();
            }
        },
        MS_viewimage: function (oEvent) {
            const oPreviewData = oEvent.getSource().getBindingContext("BookingView")?.getObject();
            if (!oPreviewData || !oPreviewData.Document) {
                sap.m.MessageToast.show("No document found");
                return;
            }
            this._openDocumentPreview(oPreviewData);
        },

        onMemberDialogTableUpdateFinished: function () {
            this._syncMemberDialogSelections();
        },

        onMemberSearch: function (oEvent) {
            const sValue = String(oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").trim();
            const oTable = this.byId("memberSelectTable");
            const oBinding = oTable && oTable.getBinding("items");
            let aFilters = [];

            if (!oBinding) {
                return;
            }

            if (sValue) {
                aFilters = [new Filter({
                    filters: [
                        new Filter("Name", FilterOperator.Contains, sValue),
                        new Filter("Relation", FilterOperator.Contains, sValue),
                        new Filter("Gender", FilterOperator.Contains, sValue),
                        new Filter("DocumentType", FilterOperator.Contains, sValue),
                        new Filter("DocumentName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })];
            }

            oBinding.filter(aFilters);
        },

        onMemberSelectionChange: function (oEvent) {
            // Prevent infinite recursion when we adjust selection programmatically
            if (this._bAdjustingSelection) {
                return;
            }

            const oTable = oEvent.getSource();
            const aSelectedContexts = oTable.getSelectedContexts("BookingView");
            const oBookingView = this.getView().getModel("BookingView");
            const iMaxPersons = parseInt(oBookingView.getProperty("/maxPersons"), 10) || 1;
            const iAllowedFamilyMembers = iMaxPersons;

            // If selection exceeds allowed family members, trim selection
            if (aSelectedContexts.length > iAllowedFamilyMembers) {
                MessageToast.show("Selected room capacity does not allow more members.");
                this._bAdjustingSelection = true;
                try {
                    // Deselect extra items, keep the first iAllowedFamilyMembers selected
                    const aSelectedItems = oTable.getSelectedItems();
                    for (let i = iAllowedFamilyMembers; i < aSelectedItems.length; i++) {
                        oTable.setSelectedItem(aSelectedItems[i], false);
                    }
                } finally {
                    this._bAdjustingSelection = false;
                }
            }
        },

        onConfirmMemberSelection: function () {
            const oBookingView = this.getView().getModel("BookingView");
            const oTable = this.byId("memberSelectTable");
            const aPreviousOccupantIds = this._getSelectedOccupantIds();
            const aSelectedContexts = oTable ? oTable.getSelectedContexts("BookingView") : [];
            const aSelectedMembers = aSelectedContexts.map(function (oCtx, iIndex) {
                const oMember = this._normalizeMemberRecord(oCtx.getObject(), iIndex);
                oMember.Selected = true;
                return oMember;
            }.bind(this));

            const iMaxPersons = parseInt(oBookingView.getProperty("/maxPersons"), 10) || 1;
            const iTotalPersons = aSelectedMembers.length;
            if (iTotalPersons > iMaxPersons) {
                MessageToast.show("Selected room capacity does not allow more members.");
                return;
            }

            if (iTotalPersons < 1) {
                MessageToast.show("Please select at least one member.");
                return;
            }

            oBookingView.setProperty("/FamilyMembers", aSelectedMembers);
            this._syncPrimaryMemberInFamilyMembers();
            if (this._haveOccupantsChanged(aPreviousOccupantIds)) {
                this._clearSelectedFacilities();
            }
            oBookingView.refresh(true);
            this._updateSelectedPersonsFromFamily();
            this._syncSelectedFacilityPersonsWithOccupants();
            this._rebuildSelectedFacilities();
            this._refreshCouponAndSummary({ checkDateWindow: false });
            this.onCloseMemberSelectionDialog();
        },

        onCloseMemberSelectionDialog: async function () {
            const oDialog = await this._getMemberSelectionDialog();
            oDialog.close();
        },

        onAddNewMemberFromDialog: async function () {
            const oBookingView = this.getView().getModel("BookingView");
            const oDraft = this._createMemberDraft();
            const oDialog = await this._getNewMemberDialog();

            oBookingView.setProperty("/NewMemberDraft", oDraft);
            oBookingView.setProperty("/NewMemberDialogTitle", "Add New Member");
            oBookingView.setProperty("/NewMemberDialogSaveText", "Save Member");
            oBookingView.refresh(true);

            // Configure date picker for DOB
            const oDatePicker = this.byId("newMemberDOB");
            if (oDatePicker) {
                const now = new Date();
                const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
                const focusDate = new Date(2000, 0, 1);

                oDatePicker.setMaxDate(now);
                oDatePicker.setMinDate(minDate);
                oDatePicker.setInitialFocusedDateValue(focusDate);
            }

            // Make date picker read-only
            this._ViewDatePickersReadOnly(["newMemberDOB"], this.getView());

            oDialog.open();
            this._attachDocumentInfoHover();
        },

        onEditMemberFromDialog: async function (oEvent) {
            const oBookingView = this.getView().getModel("BookingView");
            const oContext = oEvent.getSource().getBindingContext("BookingView");
            const oMember = oContext ? oContext.getObject() : null;
            const oDialog = await this._getNewMemberDialog();

            if (!oMember) {
                return;
            }


            oBookingView.setProperty("/NewMemberDraft", Object.assign({}, this._normalizeMemberRecord(oMember), {
                IsEditMode: true,
            }));
            oBookingView.setProperty("/NewMemberDialogTitle", "Edit Member");
            oBookingView.setProperty("/NewMemberDialogSaveText", "Update Member");
            oBookingView.refresh(true);

            // Configure date picker for DOB
            const oDatePicker = this.byId("newMemberDOB");
            if (oDatePicker) {
                const now = new Date();
                const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
                const focusDate = new Date(2000, 0, 1);

                oDatePicker.setMaxDate(now);
                oDatePicker.setMinDate(minDate);
                oDatePicker.setInitialFocusedDateValue(focusDate);
            }

            // Make date picker read-only
            this._ViewDatePickersReadOnly(["newMemberDOB"], this.getView());

            oDialog.open();
            this._attachDocumentInfoHover();
        },

        onCloseNewMemberDialog: async function () {
            const oDialog = await this._getNewMemberDialog();
            oDialog.close();
        },

        onNewMemberDialogAfterClose: function () {
            this._resetNewMemberDialogState();
        },

        onNewMemberDialogEscape: function (oEvent) {
            // Clear errors first
            this._resetNewMemberDialogState();
            // Close the dialog using the same method as Cancel button
            this.onCloseNewMemberDialog();
            // Prevent default ESC behavior (optional)
            if (oEvent) {
                oEvent.preventDefault();
            }
        },

        _resetNewMemberDialogState: function () {
            const oBookingView = this.getView().getModel("BookingView");
            const oFileUploader = this.byId("newMemberFileUploader");

            oBookingView.setProperty("/NewMemberDraft", this._createMemberDraft());
            oBookingView.setProperty("/NewMemberDialogTitle", "Add New Member");
            oBookingView.setProperty("/NewMemberDialogSaveText", "Save Member");
            oBookingView.refresh(true);

            [
                this.byId("newMemberSalutationCombo"),
                this.byId("newMemberNameInput"),
                this.byId("newMemberDOB"),
                this.byId("newMemberGenderCombo"),
                this.byId("newMemberRelationCombo"),
                this.byId("newMemberDocumentTypeCombo")
            ].forEach(function (oControl) {
                if (oControl) {
                    oControl.setValueState("None");
                }
            });

            if (oFileUploader) {
                oFileUploader.clear();
            }
        },

        onNewMemberDocumentChange: function (oEvent) {
            const oFileUploader = oEvent.getSource();
            const oModel = this.getView().getModel("BookingView");
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            const oReader = new FileReader();
            const iMaxSize = 2 * 1024 * 1024;
            const sFileName = String(oFile && oFile.name || "");
            const sExt = sFileName.includes(".") ? sFileName.split(".").pop().toLowerCase() : "";
            const bAllowedExt = ["jpg", "jpeg", "png", "webp", "pdf"].includes(sExt);
            const sMimeType = String(oFile && oFile.type || "").toLowerCase();
            const bAllowedMime = sMimeType === "application/pdf" || sMimeType.indexOf("image/") === 0;

            if (!oFile) {
                return;
            }

            // Check if document type is selected
            const sDocType = oModel.getProperty("/NewMemberDraft/DocumentType");
            if (!sDocType) {
                sap.m.MessageToast.show("Please select document type first");
                oFileUploader.clear();
                return;
            }

            if (oFile.size > iMaxSize) {
                this._showDocumentUploadSizeError();
                oFileUploader.clear();
                return;
            }

            if (!bAllowedMime && !bAllowedExt) {
                this._showDocumentUploadTypeError();
                oFileUploader.clear();
                return;
            }

            oReader.onload = function (oLoadEvent) {
                const sBase64 = String(oLoadEvent.target.result || "").split(",")[1] || "";

                // Determine new filename based on selected document type
                const sDocType = oModel.getProperty("/NewMemberDraft/DocumentType") || "document";
                let sNewName = sDocType.toLowerCase().replace(/[^a-z0-9]/g, "_");
                if (sExt) {
                    sNewName += "." + sExt;
                } else {
                    sNewName += ".pdf"; // fallback
                }

                oModel.setProperty("/NewMemberDraft/DocumentName", sNewName);
                oModel.setProperty("/NewMemberDraft/DocumentFile", oFile);
                oModel.setProperty("/NewMemberDraft/Document", sBase64);
                oModel.setProperty("/NewMemberDraft/File", sBase64);
                oModel.setProperty("/NewMemberDraft/FileType", oFile.type || "");
                oModel.refresh(true);
            };

            oReader.readAsDataURL(oFile);
        },

        onNewMemberFileSizeExceed: function (oEvent) {
            const sFileName = oEvent.getParameter("fileName") || "File";
            sap.m.MessageToast.show(sFileName + " exceeds the 2 MB size limit. Please choose a smaller file.");
            oEvent.getSource().clear();
        },

        onDeleteNewMemberDocument: function () {
            const oBookingView = this.getView().getModel("BookingView");
            const oFileUploader = this.byId("newMemberFileUploader");
            const oDraft = oBookingView.getProperty("/NewMemberDraft") || {};

            const sDocumentID = String(oDraft.DocumentID || "").trim();
            const bSavedDocument = !!(oDraft.IsEditMode && sDocumentID);

            let aPendingDeletedDocumentIDs = Array.isArray(oDraft.PendingDeletedDocumentIDs)
                ? oDraft.PendingDeletedDocumentIDs.slice()
                : [];

            let aDocuments = Array.isArray(oDraft.Documents)
                ? oDraft.Documents.slice()
                : [];

            // Existing backend document: do not delete immediately.
            // Mark it for deletion. Actual backend delete happens on Update Member.
            if (bSavedDocument && aPendingDeletedDocumentIDs.indexOf(sDocumentID) < 0) {
                aPendingDeletedDocumentIDs.push(sDocumentID);
            }

            // Remove deleted document from local draft Documents array
            if (sDocumentID) {
                aDocuments = aDocuments.filter(function (oDocument) {
                    return String(oDocument && oDocument.DocumentID || "").trim() !== sDocumentID;
                });
            } else {
                // Newly uploaded unsaved file: local remove only
                aDocuments = [];
            }

            oBookingView.setProperty("/NewMemberDraft/PendingDeletedDocumentIDs", aPendingDeletedDocumentIDs);
            oBookingView.setProperty("/NewMemberDraft/Documents", aDocuments);

            // Clear current document UI fields
            oBookingView.setProperty("/NewMemberDraft/DocumentID", "");
            oBookingView.setProperty("/NewMemberDraft/DocumentName", "");
            oBookingView.setProperty("/NewMemberDraft/DocumentFile", null);
            oBookingView.setProperty("/NewMemberDraft/Document", "");
            oBookingView.setProperty("/NewMemberDraft/File", "");
            oBookingView.setProperty("/NewMemberDraft/FileType", "");
            oBookingView.setProperty("/NewMemberDraft/DocumentType", "");

            oBookingView.refresh(true);

            if (oFileUploader) {
                oFileUploader.clear();
            }

            if (bSavedDocument) {
                MessageToast.show("Document will be deleted when you update the member.");
            } else {
                MessageToast.show("Document removed.");
            }
        },

        onNewMemberDocumentInfoPress: function () {
            const oPopover = this._getDocumentInfoPopover();
            const oIcon = this.byId("newMemberDocumentInfoIcon");

            this._clearDocumentInfoPopoverClose();

            if (oPopover.isOpen()) {
                oPopover.close();
                return;
            }

            if (oIcon) {
                oPopover.openBy(oIcon);
            }
        },

        onPreviewNewMemberDocument: function () {
            const oDoc = this.getView().getModel("BookingView").getProperty("/NewMemberDraft") || {};
            this._previewDocument(oDoc);
        },

        _previewDocument: function (oDoc) {
            this._openDocumentPreview(oDoc);
        },

        _openDocumentPreview: async function (oDoc) {
            function autoDecodeBase64(b64) {
                if (!b64) { return ""; }
                b64 = b64.replace(/\s/g, "");
                let last = b64;
                for (let i = 0; i < 5; i++) {
                    try {
                        if (last.startsWith("iVB") || last.startsWith("/9j") || last.startsWith("JVBER")) {
                            return last;
                        }
                        last = atob(last);
                    } catch (e) {
                        break;
                    }
                }
                return last;
            }

            const sRawSource = String(oDoc?.File || oDoc?.Document || oDoc?.Attachment || "").trim();
            if (!sRawSource) {
                MessageToast.show("No document to preview.");
                return;
            }

            let sBase64 = autoDecodeBase64(sRawSource);
            let sMimeType = "application/octet-stream";
            if (sBase64.startsWith("iVB")) { sMimeType = "image/png"; }
            else if (sBase64.startsWith("/9j")) { sMimeType = "image/jpeg"; }
            else if (sBase64.startsWith("JVBER")) { sMimeType = "application/pdf"; }

            const sFileName = oDoc?.FileName || oDoc?.DocumentName || "Document Preview";

            this._sPreviewFileName = sFileName;
            this._sPreviewMimeType = sMimeType;
            this._sPreviewBase64 = sBase64;

            if (this._oPreviewDialog) {
                this._oPreviewDialog.destroy();
                this._oPreviewDialog = null;
            }

            if (!this._oPreviewDialog) {
                this._oPreviewDialog = await sap.ui.core.Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.ui.com.project1.fragment.DocumentPreview",
                    controller: this,
                });
                this.getView().addDependent(this._oPreviewDialog);
            }

            const oDialog = sap.ui.core.Fragment.byId(this.getView().getId(), "previewDialog");
            const oImage = sap.ui.core.Fragment.byId(this.getView().getId(), "previewImage");
            const oHtml = sap.ui.core.Fragment.byId(this.getView().getId(), "previewHtml");

            oDialog.setTitle(sFileName);
            oImage.setVisible(false);
            oHtml.setVisible(false);
            oHtml.setContent("");

            if (this._pdfBlobUrl) {
                URL.revokeObjectURL(this._pdfBlobUrl);
                this._pdfBlobUrl = null;
            }

            if (sMimeType.startsWith("image/")) {
                const sImageSrc = `data:${sMimeType};base64,${sBase64}`;
                const oImg = new Image();
                oImg.onload = function () {
                    const viewportW = window.innerWidth * 0.8;
                    const viewportH = window.innerHeight * 0.8;
                    const imgRatio = oImg.width / oImg.height;
                    let finalWidth = viewportW;
                    let finalHeight = viewportW / imgRatio;
                    if (finalHeight > viewportH) {
                        finalHeight = viewportH;
                        finalWidth = viewportH * imgRatio;
                    }
                    oDialog.setContentWidth(finalWidth + "px");
                    oDialog.setContentHeight(finalHeight + "px");
                    oImage.setSrc(sImageSrc);
                    oImage.setVisible(true);
                    oDialog.open();
                }.bind(this);
                oImg.src = sImageSrc;
                return;
            }

            if (sMimeType === "application/pdf") {
                const byteCharacters = atob(sBase64);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                const blob = new Blob(byteArrays, { type: "application/pdf" });
                const sBlobUrl = URL.createObjectURL(blob);
                this._pdfBlobUrl = sBlobUrl;

                if (sap.ui.Device.system.phone) {
                    const oLink = document.createElement("a");
                    oLink.href = sBlobUrl;
                    oLink.download = sFileName;
                    document.body.appendChild(oLink);
                    oLink.click();
                    document.body.removeChild(oLink);
                    MessageToast.show("File downloaded successfully");
                    return;
                }

                const sIframe = '<div style="width:100%;height:100%;overflow:hidden;display:flex;"><iframe src="' + sBlobUrl + '#toolbar=0&navpanes=0&scrollbar=0" style="border:none;width:100%;height:100%;display:block;overflow:hidden;" scrolling="auto" allowfullscreen></iframe></div>';
                oDialog.setContentWidth("85%");
                oDialog.setContentHeight("90%");
                oHtml.setContent(sIframe);
                oHtml.setVisible(true);
                oDialog.open();
                return;
            }

            this.onDownloadPreview();
            MessageToast.show("Preview not supported.");
        },

        onDownloadPreview: function () {
            if (!this._sPreviewBase64) {
                MessageToast.show("No file available for download.");
                return;
            }
            let sDownloadUrl = "";
            if (this._sPreviewMimeType === "application/pdf") {
                sDownloadUrl = this._pdfBlobUrl;
            } else if (this._sPreviewMimeType.startsWith("image/")) {
                sDownloadUrl = "data:" + this._sPreviewMimeType + ";base64," + this._sPreviewBase64;
            }
            if (!sDownloadUrl) {
                MessageToast.show("Download not supported.");
                return;
            }
            const oLink = document.createElement("a");
            oLink.href = sDownloadUrl;
            oLink.download = this._sPreviewFileName || "Document";
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
        },

        onClosePreview: function () {
            if (this._pdfBlobUrl) {
                URL.revokeObjectURL(this._pdfBlobUrl);
                this._pdfBlobUrl = null;
            }
            this._sPreviewBase64 = null;
            this._sPreviewMimeType = null;
            this._sPreviewFileName = null;
            if (this._oPreviewDialog) {
                this._oPreviewDialog.close();
                this._oPreviewDialog.destroy();
                this._oPreviewDialog = null;
            }
        },

        onNewMemberNameChange: function (oEvent) {
            return utils._LCvalidateName(oEvent);
        },

        onNewMemberSalutationChange: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = this.byId("newMemberGenderCombo");
            // Clear salutation error immediately
            oSalutation.setValueState("None");
            if (!oGender) return;
            // Reset gender first
            oGender.setSelectedKey("");
            oGender.setEnabled(true);
            // Auto-map gender
            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            } else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }
            // Dr. → manual gender selection

            // Strict validation (CONTROL, not event)
            utils._LCstrictValidationSelect(oSalutation);
        },

        onNewMemberGenderChange: function (oEvent) {
            return utils._LCstrictValidationComboBox(oEvent);
        },

        onNewMemberRelationChange: function (oEvent) {
            return utils._LCstrictValidationComboBox(oEvent);
        },

        onNewMemberDOBChange: function (oEvent) {
            const oDatePicker = oEvent.getSource();
            const sValue = oDatePicker.getValue();

            // Clear any previous validation
            oDatePicker.setValueState("None");

            if (!sValue) {
                return true; // Allow empty
            }

            // Validate date is within allowed range (0-100 years)
            const now = new Date();
            const selectedDate = new Date(sValue);
            const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
            const maxDate = now;

            if (selectedDate < minDate || selectedDate > maxDate) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Date must be within last 100 years");
                return false;
            }

            return true;
        },

        onNewMemberDocumentTypeChange: function (oEvent) {
            const oComboBox = oEvent.getSource();
            const sValue = String(oComboBox.getValue() || "").trim();

            if (!sValue) {
                oComboBox.setSelectedKey("");
                oComboBox.setValue("");
                oComboBox.setValueState("None");
                return true;
            }

            return utils._LCstrictValidationComboBox(oComboBox, "ID");
        },

        onSaveNewMember: async function () {
            const oBookingView = this.getView().getModel("BookingView");
            const oDraft = Object.assign({}, oBookingView.getProperty("/NewMemberDraft") || {});
            const aMasterMembers = oBookingView.getProperty("/MasterMembers") || [];
            const aSelectedMembers = oBookingView.getProperty("/FamilyMembers") || [];
            const oNameInput = this.byId("newMemberNameInput");
            const oSalutationCombo = this.byId("newMemberSalutationCombo");
            const oGenderCombo = this.byId("newMemberGenderCombo");
            const oRelationCombo = this.byId("newMemberRelationCombo");
            const oDocumentTypeCombo = this.byId("newMemberDocumentTypeCombo");
            const oDOBPicker = this.byId("newMemberDOB");
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            // SELF is the logged-in user record. Primary occupant is a separate user choice.
            const oDraftId = oBookingView.getProperty("/NewMemberDraft/id");
            const bIsSelfDraft = oDraftId === "SELF";

            // Validate fields sequentially, stop on first error
            if (!bIsSelfDraft) {
                // Salutation validation (only for non-SELF members)
                if (!utils._LCstrictValidationSelect(oSalutationCombo)) {
                    MessageToast.show(oResourceBundle.getText("mandatoryFieldsError"));
                    return;
                }
            } else {
                oSalutationCombo.setValueState("None");
            }

            // Name validation
            if (!utils._LCvalidateName(oNameInput, "ID")) {
                MessageToast.show(oResourceBundle.getText("mandatoryFieldsError"));
                return;
            }

            if (!bIsSelfDraft) {
                // DOB validation (required field for non-SELF members)
                if (oDOBPicker) {
                    const sDOBValue = oDOBPicker.getValue() || "";
                    if (!sDOBValue.trim()) {
                        oDOBPicker.setValueState("Error");
                        oDOBPicker.setValueStateText("Date of Birth is required");
                        MessageToast.show(oResourceBundle.getText("mandatoryFieldsError"));
                        return;
                    }
                    // Validate date range
                    const now = new Date();
                    const selectedDate = new Date(sDOBValue);
                    const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
                    const maxDate = now;

                    if (selectedDate < minDate || selectedDate > maxDate) {
                        oDOBPicker.setValueState("Error");
                        oDOBPicker.setValueStateText("Date must be within last 100 years");
                        MessageToast.show(oResourceBundle.getText("mandatoryFieldsError"));
                        return;
                    }
                    oDOBPicker.setValueState("None");
                }
            } else {
                // SELF fields are read-only, so clear any stale validation state.
                if (oDOBPicker) {
                    oDOBPicker.setValueState("None");
                }
            }
            if (!bIsSelfDraft) {
                // Gender validation (only for non-SELF members)
                if (!utils._LCstrictValidationComboBox(oGenderCombo, "ID")) {
                    MessageToast.show(oResourceBundle.getText("mandatoryFieldsError"));
                    return;
                }
                // Relation validation (only for non-SELF members)
                if (!utils._LCstrictValidationComboBox(oRelationCombo, "ID")) {
                    MessageToast.show(oResourceBundle.getText("mandatoryFieldsError"));
                    return;
                }
            } else {
                // SELF fields are read-only, so clear any stale validation state.
                oGenderCombo.setValueState("None");
                oRelationCombo.setValueState("None");
            }

            // DocumentType validation (optional field - only validate if value present)
            const sDocumentTypeValue = String(oDocumentTypeCombo.getValue() || "").trim();
            if (sDocumentTypeValue && !utils._LCstrictValidationComboBox(oDocumentTypeCombo, "ID")) {
                MessageToast.show(oResourceBundle.getText("mandatoryFieldsError"));
                return;
            }

            oDraft.Salutation = oSalutationCombo.getSelectedKey() || String(oSalutationCombo.getValue() || "").trim();
            oDraft.Name = String(oNameInput.getValue() || "").trim();
            oDraft.Gender = oGenderCombo.getSelectedKey() || String(oGenderCombo.getValue() || "").trim();
            oDraft.Relation = oRelationCombo.getSelectedKey() || String(oRelationCombo.getValue() || "").trim();
            oDraft.DocumentType = oDocumentTypeCombo.getSelectedKey() || String(oDocumentTypeCombo.getValue() || "").trim();
            oDraft.Age = oDOBPicker ? oDOBPicker.getValue() || "" : "";
            oDraft.id = oDraft.id || ("FM_" + Date.now());

            const bIsEditMode = !!(oBookingView.getProperty("/NewMemberDraft/IsEditMode"));
            const bIsPrimaryMember = !!oDraft.IsPrimary;

            // Generate MemberID for new members (not edit mode)
            if (!bIsEditMode && !oDraft.MemberID && !bIsSelfDraft) {
                oDraft.MemberID = this._generateMemberID(oBookingView);
            } else if (!oDraft.MemberID && bIsSelfDraft) {
                // SELF maps to the logged-in user.
                const oHostelModel = this.getView().getModel("HostelModel");
                oDraft.MemberID = oHostelModel.getProperty("/UserID") || "";
            }

            oDraft.IsEditMode = false;
            oDraft.IsPrimary = bIsPrimaryMember;

            const oExistingSelectedMember = aSelectedMembers.find(function (oMember) {
                return oMember.id === oDraft.id;
            });
            // ✅ New members are NOT auto-selected — user must manually check the checkbox
            // in MemberSelectDialog. In edit mode, preserve the member's existing selection state.
            oDraft.Selected = bIsEditMode ? !!(oExistingSelectedMember && oExistingSelectedMember.Selected) : false;

            if (bIsSelfDraft) {
                oDraft.Relation = "Self";
                oDraft.Selected = true;
            }

            // Don't update models locally - wait for backend response oLoginModel then fresh
            // _saveMemberToBackend will fetch fresh data and update all models

            // Send member data to backend
            this._saveMemberToBackend(oDraft, bIsEditMode).then(() => {
                MessageToast.show(bIsEditMode ? "Member updated successfully." : "Member added successfully.");
                this.onCloseNewMemberDialog();
                this._syncMemberDialogSelections();
                // Update UI after backend save
                this._updateSelectedPersonsFromFamily();
                this._syncSelectedFacilityPersonsWithOccupants();
                this._rebuildSelectedFacilities();
                this._recalculateSummary();
            }).catch((oError) => {
                MessageToast.show("Failed to save member. Please try again.", oError);
            });
        },

        _generateMemberID: function (oBookingView) {
            const oHostelModel = this.getView().getModel("HostelModel");
            const sUserID = oHostelModel.getProperty("/UserID") || "";
            const aMasterMembers = oBookingView.getProperty("/MasterMembers") || [];

            // Filter members that match the UserID pattern (e.g., "00013_XX")
            const aUserMembers = aMasterMembers.filter(function (oMember) {
                if (!oMember.MemberID) return false;
                return String(oMember.MemberID).startsWith(sUserID + "_");
            });

            let iMaxSuffix = 0;

            if (aUserMembers.length > 0) {
                // Extract suffixes and find the maximum
                aUserMembers.forEach(function (oMember) {
                    const sMemberID = String(oMember.MemberID || "");
                    const aParts = sMemberID.split("_");
                    if (aParts.length === 2) {
                        const iSuffix = parseInt(aParts[1], 10);
                        if (!isNaN(iSuffix) && iSuffix > iMaxSuffix) {
                            iMaxSuffix = iSuffix;
                        }
                    }
                });
            }

            // Increment by 1
            const iNewSuffix = iMaxSuffix + 1;

            // Format with leading zeros (2 digits)
            const sFormattedSuffix = iNewSuffix < 10 ? "0" + iNewSuffix : String(iNewSuffix);

            const sNewMemberID = sUserID + "_" + sFormattedSuffix;

            return sNewMemberID;
        },
        _deletePendingMemberDocuments: async function (aDocumentIDs) {
            const aUniqueDocumentIDs = [];

            (Array.isArray(aDocumentIDs) ? aDocumentIDs : []).forEach(function (sDocumentID) {
                sDocumentID = String(sDocumentID || "").trim();

                if (sDocumentID && aUniqueDocumentIDs.indexOf(sDocumentID) < 0) {
                    aUniqueDocumentIDs.push(sDocumentID);
                }
            });

            for (let i = 0; i < aUniqueDocumentIDs.length; i += 1) {
                await this.ajaxDeleteWithJQuery("HM_CustomerDocument", {
                    filters: {
                        DocumentID: aUniqueDocumentIDs[i]
                    }
                });
            }
        },
        _saveMemberToBackend: async function (oMember, bIsEditMode) {
            const oHostelModel = this.getView().getModel("HostelModel");
            const sUserID = oHostelModel.getProperty("/UserID") || "";

            const bIsSelfMember = oMember && (
                oMember.id === "SELF" ||
                String(oMember.Relation || "").trim().toLowerCase() === "self"
            );

            const sMemberID = bIsSelfMember
                ? (oMember.MemberID || sUserID)
                : (oMember.MemberID || oMember.id || "");

            const aDeletedDocumentIDs = Array.isArray(oMember.PendingDeletedDocumentIDs)
                ? oMember.PendingDeletedDocumentIDs.slice()
                : [];

            const oMemberData = {
                MemberID: sMemberID,
                Salutation: oMember.Salutation || "",
                Name: oMember.Name || "",
                DateOfBirth: oMember.Age || "",
                Relation: bIsSelfMember ? "Self" : (oMember.Relation || ""),
                Gender: oMember.Gender || "",
                UserID: sUserID
            };

            const aExistingDocuments = Array.isArray(oMember.Documents)
                ? oMember.Documents
                : [];

            // Keep existing documents except the ones user removed in edit mode
            const aDocuments = aExistingDocuments
                .filter(function (oDocument) {
                    const sExistingDocumentID = String(oDocument && oDocument.DocumentID || "").trim();

                    return !sExistingDocumentID || aDeletedDocumentIDs.indexOf(sExistingDocumentID) < 0;
                })
                .map(function (oDocument) {
                    const oDocumentData = {
                        DocumentType: oDocument.DocumentType || "",
                        FileName: oDocument.FileName || oDocument.DocumentName || "",
                        FileType: (oDocument.File || oDocument.Document) ? (oDocument.FileType || "") : "",
                        MemberID: oDocument.MemberID || sMemberID,
                        UserID: oDocument.UserID || sUserID,
                        File: oDocument.File || oDocument.Document || ""
                    };

                    if (oDocument.DocumentID) {
                        oDocumentData.DocumentID = oDocument.DocumentID;
                    }

                    return oDocumentData;
                })
                .filter(function (oDocument) {
                    return !!(oDocument.File || oDocument.FileName);
                });

            // Merge the document currently shown in the dialog into the payload.
            // If the user removed the old document and uploaded a new file,
            // the old DocumentID will not be reused.
            if (oMember.File || oMember.DocumentName) {
                const oCurrentDocument = {
                    DocumentType: oMember.DocumentType || "",
                    FileName: oMember.DocumentName || "",
                    FileType: (oMember.File || oMember.Document) ? (oMember.FileType || "") : "",
                    MemberID: sMemberID,
                    UserID: sUserID,
                    File: oMember.File || oMember.Document || ""
                };

                if (
                    bIsEditMode &&
                    oMember.DocumentID &&
                    aDeletedDocumentIDs.indexOf(String(oMember.DocumentID || "").trim()) < 0
                ) {
                    oCurrentDocument.DocumentID = oMember.DocumentID;
                }

                const iExistingIndex = aDocuments.findIndex(function (oDocument) {
                    if (oCurrentDocument.DocumentID && oDocument.DocumentID) {
                        return oDocument.DocumentID === oCurrentDocument.DocumentID;
                    }

                    return String(oDocument.DocumentType || "").trim() ===
                        String(oCurrentDocument.DocumentType || "").trim();
                });

                if (iExistingIndex >= 0) {
                    aDocuments[iExistingIndex] = Object.assign({}, aDocuments[iExistingIndex], oCurrentDocument);
                } else {
                    aDocuments.push(oCurrentDocument);
                }
            }

            const aMembers = [];

            if (oMemberData.Name) {
                const oMemberWithDocuments = Object.assign({}, oMemberData);
                oMemberWithDocuments.Documents = aDocuments;
                aMembers.push(oMemberWithDocuments);
            }

            const oPayload = {
                data: [
                    {
                        Members: aMembers
                    }
                ]
            };

            if (aMembers.length === 0) {
                return Promise.resolve();
            }

            this.getBusyDialog();

            try {
                const sEndpoint = "HM_MemberDocument";

                // Important:
                // In edit mode, delete removed backend document first,
                // then continue with the normal update flow.
                if (bIsEditMode && aDeletedDocumentIDs.length > 0) {
                    await this._deletePendingMemberDocuments(aDeletedDocumentIDs);
                }

                const oResponse = bIsEditMode
                    ? await this.ajaxUpdateWithJQuery(sEndpoint, oPayload)
                    : await this.ajaxCreateWithJQuery(sEndpoint, oPayload);

                // Fetch member documents from backend after create/update
                const oDocumentsResponse = await this.ajaxReadWithJQuery("HM_MemberDocument", {
                    UserID: sUserID
                });

                if (oDocumentsResponse && oDocumentsResponse.data) {
                    const aMemberList = Array.isArray(oDocumentsResponse.data)
                        ? oDocumentsResponse.data
                        : [];

                    const oHostelModel = this.getView().getModel("HostelModel");
                    const oBookingView = this.getView().getModel("BookingView");

                    oHostelModel.setProperty("/MemberList", aMemberList);

                    const aSelectedMembers = oBookingView.getProperty("/FamilyMembers") || [];

                    function isSelfMember(oMember) {
                        const sRelation = String(oMember.Relation || "").trim().toLowerCase();
                        return sRelation === "self";
                    }

                    const aNormalizedSelectedMembers = aSelectedMembers.map(function (oMember) {
                        if (isSelfMember(oMember)) {
                            return Object.assign({}, oMember, {
                                id: "SELF"
                            });
                        }

                        return oMember;
                    });

                    const aSelectedIds = new Set(aNormalizedSelectedMembers.map(function (oMember) {
                        return oMember.id;
                    }));

                    const oCurrentPrimary = aNormalizedSelectedMembers.find(function (oMember) {
                        return oMember && oMember.IsPrimary === true;
                    }) || {};

                    const sCurrentPrimaryId = oCurrentPrimary.id;

                    const oSelfRecord = this._getPrimaryMemberRecord();

                    let bSelfSelectedFromBackend = false;

                    const aFilteredMemberList = aMemberList.filter(function (oMember) {
                        if (isSelfMember(oMember)) {
                            bSelfSelectedFromBackend = bSelfSelectedFromBackend || oMember.Selected === true;
                            return false;
                        }

                        return true;
                    });

                    if (bSelfSelectedFromBackend) {
                        oSelfRecord.Selected = true;
                    }

                    const aAllMembers = [oSelfRecord].concat(aFilteredMemberList);

                    const aNormalizedMembers = aAllMembers.map(function (oMember, iIndex) {
                        const oNormalized = this._normalizeMemberRecord(oMember, iIndex);

                        if (aSelectedIds.has(oNormalized.id)) {
                            oNormalized.Selected = true;
                        }

                        if (sCurrentPrimaryId && oNormalized.id === sCurrentPrimaryId) {
                            oNormalized.IsPrimary = true;
                        }

                        return oNormalized;
                    }.bind(this));

                    oBookingView.setProperty("/MasterMembers", aNormalizedMembers);

                    const aUpdatedSelectedMembers = aNormalizedMembers
                        .filter(function (oMember) {
                            return oMember.Selected;
                        })
                        .map(function (oMember) {
                            return Object.assign({}, oMember, {
                                Selected: true
                            });
                        });

                    oBookingView.setProperty("/FamilyMembers", aUpdatedSelectedMembers);
                    oHostelModel.setProperty("/FamilyMembers", aUpdatedSelectedMembers);

                    this._syncPrimaryMemberInFamilyMembers();
                    oBookingView.refresh(true);
                }

                return oResponse;
            } catch (oError) {
                console.error("[_saveMemberToBackend] Error calling backend:", oError);
                throw oError;
            } finally {
                this.closeBusyDialog();
            }
        },

        formatSelectedMembersSummary: function (aMembers) {
            const aNames = (Array.isArray(aMembers) ? aMembers : []).map(function (oMember) {
                return String(oMember.Name || "").trim();
            }).filter(Boolean);

            if (!aNames.length) {
                return "";
            }

            return aNames.join(", ");
        },

        formatSelectedMembersCount: function (aMembers) {
            const iCount = Array.isArray(aMembers) ? aMembers.length : 0;
            return iCount + " member(s) selected";
        },

        formatPrimaryOccupantName: function (aMembers) {
            if (!Array.isArray(aMembers)) {
                return "";
            }
            const oPrimary = aMembers.find(function (oMember) {
                return oMember && oMember.IsPrimary === true;
            });
            if (!oPrimary) {
                return "";
            }
            // Return only the name, salutation is sent separately
            return oPrimary.Name || "";
        },

        _getDocumentInfoPopover: function () {
            if (!this._oDocumentInfoPopover) {
                this._oDocumentInfoPopover = new ResponsivePopover({
                    showHeader: true,
                    showCloseButton: true,
                    title: "Document Upload Info",
                    placement: "Bottom",
                    contentWidth: sap.ui.Device.system.phone ? "95vw" : "18rem",
                    content: [
                        new Text({
                            text: "Choose a document & upload clear image or PDF up to 2 MB",
                            wrapping: true
                        }).addStyleClass("sapUiSmallMargin")
                    ]
                }).addStyleClass("facilityBreakdownBtn");

                if (sap.ui.Device.system.phone) {
                    this._oDocumentInfoPopover.setContentHeight(null);
                    this._applyMobilePopoverDialogBehavior(this._oDocumentInfoPopover, "mobileAutoHeightPopoverDialog");
                }

                this.getView().addDependent(this._oDocumentInfoPopover);
            }

            return this._oDocumentInfoPopover;
        },

        _attachDocumentInfoHover: function () {
            const oIcon = this.byId("bookingDocumentInfoIcon");
            const oNewMemberIcon = this.byId("newMemberDocumentInfoIcon");

            if (oIcon && !oIcon.data("hoverBound")) {
                oIcon.data("hoverBound", true);
                oIcon.attachBrowserEvent("mouseenter", this._openDocumentInfoPopover.bind(this));
                oIcon.attachBrowserEvent("mouseleave", this._scheduleDocumentInfoPopoverClose.bind(this));
            }

            if (oNewMemberIcon && !oNewMemberIcon.data("hoverBound")) {
                oNewMemberIcon.data("hoverBound", true);
                oNewMemberIcon.attachBrowserEvent("mouseenter", this._openNewMemberDocumentInfoPopover.bind(this));
                oNewMemberIcon.attachBrowserEvent("mouseleave", this._scheduleDocumentInfoPopoverClose.bind(this));
            }

            if ((!oIcon || oIcon.data("hoverBound")) && (!oNewMemberIcon || oNewMemberIcon.data("hoverBound"))) {
                if (this._getDocumentInfoPopover().data("hoverAfterOpenBound")) {
                    return;
                }
            }

            this._getDocumentInfoPopover().attachAfterOpen(function () {
                const oPopover = this._getDocumentInfoPopover();

                if (!oPopover.data("hoverBound")) {
                    oPopover.data("hoverBound", true);
                    oPopover.attachBrowserEvent("mouseenter", this._clearDocumentInfoPopoverClose.bind(this));
                    oPopover.attachBrowserEvent("mouseleave", this._scheduleDocumentInfoPopoverClose.bind(this));
                }
            }.bind(this));
            this._getDocumentInfoPopover().data("hoverAfterOpenBound", true);
        },

        _openDocumentInfoPopover: function () {
            const oIcon = this.byId("bookingDocumentInfoIcon");

            this._clearDocumentInfoPopoverClose();

            if (oIcon) {
                this._getDocumentInfoPopover().openBy(oIcon);
            }
        },

        _openNewMemberDocumentInfoPopover: function () {
            const oIcon = this.byId("newMemberDocumentInfoIcon");

            this._clearDocumentInfoPopoverClose();

            if (oIcon) {
                this._getDocumentInfoPopover().openBy(oIcon);
            }
        },

        _clearDocumentInfoPopoverClose: function () {
            if (this._iDocumentInfoPopoverTimer) {
                clearTimeout(this._iDocumentInfoPopoverTimer);
                this._iDocumentInfoPopoverTimer = null;
            }
        },

        _scheduleDocumentInfoPopoverClose: function () {
            this._clearDocumentInfoPopoverClose();
            this._iDocumentInfoPopoverTimer = setTimeout(function () {
                if (this._oDocumentInfoPopover) {
                    this._oDocumentInfoPopover.close();
                }
            }.bind(this), 180);
        },

        onDocumentInfoPress: function () {
            const oPopover = this._getDocumentInfoPopover();

            this._clearDocumentInfoPopoverClose();

            if (oPopover.isOpen()) {
                oPopover.close();
                return;
            }

            this._openDocumentInfoPopover();
        },

        // Facility discount info popover methods
        onFacilityDiscountInfoPress: function () {
            const oPopover = this._getFacilityDiscountInfoPopover();

            this._clearFacilityDiscountInfoPopoverClose();

            if (oPopover.isOpen()) {
                oPopover.close();
                return;
            }

            this._openFacilityDiscountInfoPopover();
        },

        _getFacilityDiscountInfoPopover: function () {
            if (!this._oFacilityDiscountInfoPopover) {
                this._oFacilityDiscountInfoPopover = new ResponsivePopover({
                    showHeader: false,
                    placement: "Bottom",
                    contentWidth: "25rem",
                    content: [
                        new sap.m.VBox({
                            items: {
                                path: 'HostelModel>/FacilityDiscounts',
                                template: new sap.m.VBox({
                                    items: [
                                        new Text({
                                            text: "{HostelModel>DisplayText}",
                                            wrapping: true
                                        }).addStyleClass("sapUiTinyMarginBottom"),
                                        new Text({
                                            text: {
                                                parts: [
                                                    { path: "HostelModel>DiscountAmount" },
                                                    { path: "HostelModel>/Currency" }
                                                ],
                                                formatter: function (fDiscountAmount, sCurrency) {
                                                    const sCurrencySymbol = sCurrency || "INR";
                                                    if (fDiscountAmount > 0) {
                                                        return "Discount: " + fDiscountAmount.toFixed(2) + " " + sCurrencySymbol;
                                                    } else {
                                                        return "Complimentary offer (₹0)";
                                                    }
                                                }
                                            },
                                            wrapping: true
                                        }).addStyleClass("sapUiTinyMarginBottom sapUiSmallMarginBegin")
                                    ]
                                }),
                                templateShareable: false
                            }
                        }).addStyleClass("sapUiSmallMargin")
                    ]
                });

                this.getView().addDependent(this._oFacilityDiscountInfoPopover);
            }

            return this._oFacilityDiscountInfoPopover;
        },

        _openFacilityDiscountInfoPopover: function () {
            const oIcon = this.byId("facilityDiscountInfoIcon");

            this._clearFacilityDiscountInfoPopoverClose();

            if (oIcon) {
                this._getFacilityDiscountInfoPopover().openBy(oIcon);
            }
        },

        _clearFacilityDiscountInfoPopoverClose: function () {
            if (this._iFacilityDiscountInfoPopoverTimer) {
                clearTimeout(this._iFacilityDiscountInfoPopoverTimer);
                this._iFacilityDiscountInfoPopoverTimer = null;
            }
        },

        _scheduleFacilityDiscountInfoPopoverClose: function () {
            this._clearFacilityDiscountInfoPopoverClose();
            this._iFacilityDiscountInfoPopoverTimer = setTimeout(function () {
                if (this._oFacilityDiscountInfoPopover) {
                    this._oFacilityDiscountInfoPopover.close();
                }
            }.bind(this), 180);
        },

        _attachFacilityDiscountInfoHover: function () {
            const oIcon = this.byId("facilityDiscountInfoIcon");

            if (oIcon && !oIcon.data("hoverBound")) {
                oIcon.data("hoverBound", true);
                oIcon.attachBrowserEvent("mouseenter", this._openFacilityDiscountInfoPopover.bind(this));
                oIcon.attachBrowserEvent("mouseleave", this._scheduleFacilityDiscountInfoPopoverClose.bind(this));
            }

            if (oIcon && oIcon.data("hoverBound")) {
                if (this._getFacilityDiscountInfoPopover().data("hoverAfterOpenBound")) {
                    return;
                }
            }

            this._getFacilityDiscountInfoPopover().attachAfterOpen(function () {
                const oPopover = this._getFacilityDiscountInfoPopover();

                if (!oPopover.data("hoverBound")) {
                    oPopover.data("hoverBound", true);
                    oPopover.attachBrowserEvent("mouseenter", this._clearFacilityDiscountInfoPopoverClose.bind(this));
                    oPopover.attachBrowserEvent("mouseleave", this._scheduleFacilityDiscountInfoPopoverClose.bind(this));
                }
            }.bind(this));
            this._getFacilityDiscountInfoPopover().data("hoverAfterOpenBound", true);
        },

        // Facilities breakdown popover methods
        onFacilitiesBreakdownPress: function () {
            const oPopover = this._getFacilitiesBreakdownPopover();

            this._clearFacilitiesBreakdownPopoverClose();

            if (oPopover.isOpen()) {
                oPopover.close();
                return;
            }

            this._openFacilitiesBreakdownPopover();
        },

        _getFacilitiesBreakdownPopover: function () {
            if (!this._oFacilitiesBreakdownPopover) {
                this._oFacilitiesBreakdownPopover = new ResponsivePopover({
                    showHeader: true,
                    title: "Facilities Breakdown",
                    placement: "Bottom",
                    contentWidth: sap.ui.Device.system.phone ? "95vw" : "28rem",
                    content: [
                        new sap.m.VBox({
                            items: {
                                path: 'HostelModel>/AllSelectedFacilities',
                                template: new sap.m.VBox({
                                    items: [
                                        new Text({
                                            text: {
                                                parts: [
                                                    { path: "HostelModel>FacilityName" },
                                                    { path: "HostelModel>BreakdownText" },
                                                    { path: "HostelModel>TotalAmount" },
                                                    { path: "HostelModel>Currency" }
                                                ],
                                                formatter: function (sName, sBreakdown, fTotal, sCurrency) {
                                                    var sResult = sName || "Facility";
                                                    if (sBreakdown) {
                                                        sResult += ": " + sBreakdown;
                                                    }
                                                    // Only append total for SINGLE/QTY modes (breakdown has no =).
                                                    // PERSON/PERSON_QTY modes already have per-person subtotals.
                                                    if (fTotal !== undefined && fTotal !== null && (sBreakdown || "").indexOf("=") === -1) {
                                                        sResult += " = " + fTotal + " " + (sCurrency || "");
                                                    }
                                                    return sResult;
                                                }
                                            },
                                            wrapping: true
                                        }).addStyleClass("sapUiTinyMarginBottom")
                                    ]
                                }),
                                templateShareable: false
                            }
                        }).addStyleClass("sapUiSmallMargin")
                    ]
                }).addStyleClass("facilityBreakdownBtn");

                if (sap.ui.Device.system.phone) {
                    this._oFacilitiesBreakdownPopover.setContentHeight(null);
                    this._applyMobilePopoverDialogBehavior(this._oFacilitiesBreakdownPopover, "mobileAutoHeightPopoverDialog");
                }

                this.getView().addDependent(this._oFacilitiesBreakdownPopover);
            }

            return this._oFacilitiesBreakdownPopover;
        },

        _openFacilitiesBreakdownPopover: function () {
            var oIcon = this.byId("facilitiesBreakdownIcon") || this.byId("editFacilitiesBreakdownIcon");

            this._clearFacilitiesBreakdownPopoverClose();

            if (oIcon) {
                this._getFacilitiesBreakdownPopover().openBy(oIcon);
            }
        },

        _clearFacilitiesBreakdownPopoverClose: function () {
            if (this._iFacilitiesBreakdownPopoverTimer) {
                clearTimeout(this._iFacilitiesBreakdownPopoverTimer);
                this._iFacilitiesBreakdownPopoverTimer = null;
            }
        },

        _scheduleFacilitiesBreakdownPopoverClose: function () {
            this._clearFacilitiesBreakdownPopoverClose();
            this._iFacilitiesBreakdownPopoverTimer = setTimeout(function () {
                if (this._oFacilitiesBreakdownPopover) {
                    this._oFacilitiesBreakdownPopover.close();
                }
            }.bind(this), 180);
        },

        _attachFacilitiesBreakdownHover: function () {
            var aIconIds = ["facilitiesBreakdownIcon", "editFacilitiesBreakdownIcon"];

            aIconIds.forEach(function (sId) {
                var oIcon = this.byId(sId);

                if (oIcon && !oIcon.data("hoverBound")) {
                    oIcon.data("hoverBound", true);
                    oIcon.attachBrowserEvent("mouseenter", this._openFacilitiesBreakdownPopover.bind(this));
                    oIcon.attachBrowserEvent("mouseleave", this._scheduleFacilitiesBreakdownPopoverClose.bind(this));
                }
            }.bind(this));

            if (this._getFacilitiesBreakdownPopover().data("hoverAfterOpenBound")) {
                return;
            }

            this._getFacilitiesBreakdownPopover().attachAfterOpen(function () {
                var oPopover = this._getFacilitiesBreakdownPopover();

                if (!oPopover.data("hoverBound")) {
                    oPopover.data("hoverBound", true);
                    oPopover.attachBrowserEvent("mouseenter", this._clearFacilitiesBreakdownPopoverClose.bind(this));
                    oPopover.attachBrowserEvent("mouseleave", this._scheduleFacilitiesBreakdownPopoverClose.bind(this));
                }
            }.bind(this));
            this._getFacilitiesBreakdownPopover().data("hoverAfterOpenBound", true);
        },

        _showDocumentUploadTypeError: function () {
            MessageToast.show("Only PDF and image files are allowed.");
        },

        _showDocumentUploadSizeError: function () {
            MessageToast.show("Maximum file size allowed is 2 MB.");
        },

        onDocumentUploadTypeMismatch: function (oEvent) {
            const oUploader = oEvent.getSource();

            this._showDocumentUploadTypeError();

            if (oUploader && oUploader.clear) {
                oUploader.clear();
            }
        },

        onDocumentUploadSizeExceed: function (oEvent) {
            const oUploader = oEvent.getSource();

            this._showDocumentUploadSizeError();

            if (oUploader && oUploader.clear) {
                oUploader.clear();
            }
        },


        onFamilyDocumentChange: function (oEvent) {
            const oFileUploader = oEvent.getSource();
            const oContext = oFileUploader.getBindingContext("BookingView");
            const sPath = oContext.getPath();
            const oModel = this.getView().getModel("BookingView");
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            const oReader = new FileReader();
            const iMaxSize = 2 * 1024 * 1024;
            const sFileName = String(oFile && oFile.name || "");
            const sExt = sFileName.includes(".") ? sFileName.split(".").pop().toLowerCase() : "";
            const bAllowedExt = ["jpg", "jpeg", "png", "webp", "pdf"].includes(sExt);
            const sMimeType = String(oFile && oFile.type || "").toLowerCase();
            const bAllowedMime = sMimeType === "application/pdf" || sMimeType.indexOf("image/") === 0;

            if (!oFile) {
                return;
            }

            if (oFile.size > iMaxSize) {
                this._showDocumentUploadSizeError();
                oFileUploader.clear();
                return;
            }

            if (!bAllowedMime && !bAllowedExt) {
                this._showDocumentUploadTypeError();
                oFileUploader.clear();
                return;
            }

            oReader.onload = function (oLoadEvent) {
                const sBase64 = String(oLoadEvent.target.result || "").split(",")[1] || "";

                oModel.setProperty(sPath + "/DocumentName", oFile.name);
                oModel.setProperty(sPath + "/DocumentFile", oFile);
                oModel.setProperty(sPath + "/Document", sBase64);
                oModel.setProperty(sPath + "/File", sBase64);
                oModel.refresh(true);
            };

            oReader.readAsDataURL(oFile);
        },

        _getVisibleCardCount: function () {
            const bIsMobile = sap.ui.Device.support.touch && window.innerWidth <= 1024;

            const oViewport = this.byId("facilityViewport");
            if (!oViewport || !oViewport.getDomRef()) {
                return bIsMobile ? 1 : 3;
            }

            const iContainerWidth = oViewport.getDomRef().clientWidth;
            if (!iContainerWidth || iContainerWidth <= 0) {
                return bIsMobile ? 1 : 3;
            }

            // On mobile, always show 1 card
            if (bIsMobile) {
                return 1;
            }

            const iCardWidth = this._iFacilityCardWidth || 250;
            const iGap = this._iFacilityCardGap || 16;

            // How many cards fit: floor((availableWidth + gap) / (cardWidth + gap))
            const iFit = Math.floor((iContainerWidth + iGap) / (iCardWidth + iGap));
            return Math.max(1, iFit);
        },

        _updateFacilityNavButtons: function (aFacilities) {
            const oPrevBtn = this.byId("facilityPrevBtn");
            const oNextBtn = this.byId("facilityNextBtn");
            const iStart = this._iFacilityStartIndex || 0;
            const iPageSize = this._iFacilityPageSize || 1;

            if (oPrevBtn) {
                if (iStart > 0) {
                    oPrevBtn.setVisible(true);
                    oPrevBtn.removeStyleClass("facilityNavBtnHidden");
                } else {
                    oPrevBtn.setVisible(true);
                    oPrevBtn.addStyleClass("facilityNavBtnHidden");
                }
            }
            if (oNextBtn) {
                if (iStart + iPageSize < aFacilities.length) {
                    oNextBtn.setVisible(true);
                    oNextBtn.removeStyleClass("facilityNavBtnHidden");
                } else {
                    oNextBtn.setVisible(true);
                    oNextBtn.addStyleClass("facilityNavBtnHidden");
                }
            }
        },

        _onFacilityCarouselResize: function () {
            if (!this.getView() || !this.getView().getDomRef()) {
                return;
            }
            var iNewPageSize = this._getVisibleCardCount();
            if (iNewPageSize !== this._iFacilityPageSize) {
                this._iFacilityPageSize = iNewPageSize;
                var aFacilities = this.getView().getModel("FacilityModel").getProperty("/Facilities") || [];
                var iMaxStart = Math.max(aFacilities.length - iNewPageSize, 0);
                this._iFacilityStartIndex = Math.min(this._iFacilityStartIndex || 0, iMaxStart);
                this._renderFacilityCards();
            }
        },

        _renderFacilityCards: function () {
            const oContainer = this.byId("facilityCardsContainer");
            const aFacilities = this.getView().getModel("FacilityModel").getProperty("/Facilities") || [];

            if (!oContainer) {
                return;
            }

            oContainer.removeAllItems();

            if (!aFacilities.length) {
                oContainer.addItem(new sap.m.Text({
                    text: "No facilities available for the selected room plan."
                }).addStyleClass("sapUiSmallMarginTop"));
                this._updateFacilityNavButtons(aFacilities);
                return;
            }

            // Calculate visible card count dynamically from available viewport width
            this._iFacilityPageSize = this._getVisibleCardCount();
            var iPageSize = this._iFacilityPageSize;
            var iMaxStart = Math.max(aFacilities.length - iPageSize, 0);
            this._iFacilityStartIndex = Math.min(this._iFacilityStartIndex || 0, iMaxStart);

            var iStart = this._iFacilityStartIndex;
            var aVisibleFacilities = aFacilities.slice(iStart, iStart + iPageSize);
            this._updateFacilityNavButtons(aFacilities);

            var oRow = new sap.m.HBox({
                width: "100%",
                justifyContent: "Center",
                alignItems: "Start",
                wrap: sap.ui.Device.system.phone ? "Wrap" : "NoWrap"
            }).addStyleClass("sapUiSmallMarginTop facilityCardsRow");

            var that = this;
            aVisibleFacilities.forEach(function (oFacility) {
                var oCard = new sap.m.VBox({
                    width: sap.ui.Device.system.phone ? "100%" : "250px",
                    alignItems: "Stretch",
                    justifyContent: "Start",
                    items: [
                        new sap.m.VBox({
                            width: "100%",
                            height: "190px",
                            items: [
                                new sap.m.HBox({
                                    visible: !!oFacility.Selected,
                                    items: [
                                        new sap.m.Text({ text: "Added" })
                                    ]
                                }).addStyleClass("selectedBadge"),
                                new sap.m.Image({
                                    src: oFacility.Image,
                                    width: "100%",
                                    height: "190px",
                                    densityAware: false,
                                    decorative: false
                                }).addStyleClass("serviceImage facilityServiceImage"),
                                new sap.m.VBox({
                                    width: "100%",
                                    justifyContent: "End",
                                    items: [
                                        new sap.m.Text({
                                            text: oFacility.DisplayFacilityName || oFacility.FacilityName,
                                            textAlign: "Center",
                                            wrapping: true
                                        }).addStyleClass("facilityOverlayText facilityCardTitle")
                                    ]
                                }).addStyleClass("facilityTitleOverlay")
                            ]
                        }).addStyleClass("imageContainer facilityImageContainer"),
                        new sap.m.VBox({
                            width: "100%",
                            items: [
                                new sap.m.Text({
                                    text: this._getFacilityCardPriceText(oFacility),
                                    textAlign: "Begin",
                                    wrapping: true
                                }).addStyleClass("facilityCardAmount"),
                                new sap.m.Text({
                                    text: this._getFacilityCardDetailText(oFacility),
                                    textAlign: "Begin",
                                    wrapping: true
                                }).addStyleClass("facilityCardMeta"),
                                new sap.m.Text({
                                    text: this._getFacilityCardSummaryText(oFacility),
                                    textAlign: "Begin",
                                    wrapping: true,
                                    visible: !!oFacility.Selected
                                }).addStyleClass("facilityCardSummary"),
                                new sap.m.Text({
                                    text: this._getFacilityCardTotalText(oFacility),
                                    textAlign: "Begin",
                                    wrapping: true,
                                    visible: !!oFacility.Selected
                                }).addStyleClass("facilityCardTotal"),
                                new sap.m.Text({
                                    text: this._getFacilityCardActionText(oFacility),
                                    textAlign: "Begin",
                                    wrapping: false
                                }).addStyleClass("facilityCardHint")
                            ]
                        }).addStyleClass("facilityCardBody")
                    ]
                }).addStyleClass("serviceCard facilityServiceCard sapUiSmallMarginEnd");

                if (oFacility.Selected) {
                    oCard.addStyleClass("serviceCardSelected");
                }

                oCard.attachBrowserEvent("click", this.onFacilityCardPress.bind(this, oFacility, oCard));
                oRow.addItem(oCard);
            }.bind(this));

            oContainer.addItem(oRow);
            this._attachFacilitySwipeHandlers();
            this._renderFacilityDots();
        },


        _attachFacilitySwipeHandlers: function () {
            // Use touch-support + width instead of system.phone so it works
            // with Chrome DevTools device emulation as well as real devices.
            if (!sap.ui.Device.support.touch || window.innerWidth > 1024) {
                return;
            }

            var oViewport = this.byId("facilityViewport");
            if (!oViewport) {
                return;
            }

            // attachBrowserEvent is managed by UI5 and automatically
            // re-attaches when the underlying DOM is recreated.
            // Guard on the control instance so we never double-attach.
            if (this._oFacilityViewportControl === oViewport) {
                return;
            }
            this._oFacilityViewportControl = oViewport;

            var iStartX = 0, iStartY = 0;
            var that = this;

            oViewport.attachBrowserEvent("touchstart", function (e) {
                if (e.touches && e.touches.length) {
                    iStartX = e.touches[0].clientX;
                    iStartY = e.touches[0].clientY;
                } else if (e.targetTouches && e.targetTouches.length) {
                    iStartX = e.targetTouches[0].clientX;
                    iStartY = e.targetTouches[0].clientY;
                }
            });

            oViewport.attachBrowserEvent("touchend", function (e) {
                var iEndX, iEndY;
                if (e.changedTouches && e.changedTouches.length) {
                    iEndX = e.changedTouches[0].clientX;
                    iEndY = e.changedTouches[0].clientY;
                } else {
                    return;
                }
                var iDiffX = iStartX - iEndX;
                var iDiffY = iStartY - iEndY;

                if (Math.abs(iDiffX) > Math.abs(iDiffY) && Math.abs(iDiffX) > 50) {
                    if (iDiffX > 0) {
                        that.onFacilityNext();
                    } else {
                        that.onFacilityPrev();
                    }
                }
            });
        },


        _renderFacilityDots: function () {
            if (!sap.ui.Device.support.touch || window.innerWidth > 1024) {
                return;
            }
            var oDotsContainer = this.byId("facilityDotsContainer");
            if (!oDotsContainer) return;
            oDotsContainer.destroyItems();
            oDotsContainer.setVisible(false);

            var aFacilities = this.getView().getModel("FacilityModel").getProperty("/Facilities") || [];
            var iTotal = aFacilities.length;
            if (iTotal <= 1) return;

            var iPageSize = this._iFacilityPageSize || this._getVisibleCardCount();
            var iCurrent = this._iFacilityStartIndex || 0;

            // Calculate active dot index (page-based)
            var iActivePage = Math.floor(iCurrent / iPageSize);
            var iTotalPages = Math.ceil(iTotal / iPageSize);

            oDotsContainer.setVisible(true);
            for (var i = 0; i < iTotalPages; i++) {
                var oDot = new sap.m.HBox({
                    width: "10px",
                    height: "10px"
                }).addStyleClass("facilityDot");
                if (i === iActivePage) {
                    oDot.addStyleClass("facilityDotActive");
                }
                oDotsContainer.addItem(oDot);
            }

            // Show/hide the swipe-hint animation on the right edge based on page
            var oViewport = this.byId("facilityViewport");
            if (oViewport) {
                if (iActivePage >= iTotalPages - 1) {
                    oViewport.addStyleClass("facilityNoSwipeHint");
                } else {
                    oViewport.removeStyleClass("facilityNoSwipeHint");
                }
            }
        },


        _initializeBookingData: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oData = oModel.getData() || {};
            const oBookingView = this.getView().getModel("BookingView");
            const oToday = new Date();
            const aPaymentMethods = [];
            let aOriginalPersonOptions = Array.isArray(oData.NoOfPersonsList) ? oData.NoOfPersonsList.slice() : [];
            const iCapacity = Math.max(parseInt(oData.Capacity, 10) || 1, 1);
            const sPropertyType = String(oData.PropertyType || "").trim();

            oToday.setHours(0, 0, 0, 0);

            if (this._toNumber(oData.Price) > 0) {
                aPaymentMethods.push({ key: "Per Day", text: "Per Day" });
            }
            if (this._toNumber(oData.MonthPrice) > 0) {
                aPaymentMethods.push({ key: "Per Month", text: "Per Month" });
            }
            if (this._toNumber(oData.YearPrice) > 0) {
                aPaymentMethods.push({ key: "Per Year", text: "Per Year" });
            }

            if (aOriginalPersonOptions.length === 0) {
                aOriginalPersonOptions = this._buildKeyTextList(iCapacity);
            }

            oBookingView.setProperty("/originalPersonOptions", aOriginalPersonOptions);
            oBookingView.setProperty("/maxPersons", iCapacity);
            oBookingView.setProperty("/PropertyTypes", sPropertyType ? [{
                key: sPropertyType,
                text: sPropertyType
            }] : []);

            oModel.setProperty("/PropertyType", sPropertyType);
            oModel.setProperty("/AvailablePaymentMethods", aPaymentMethods);
            oModel.setProperty("/SelectedMonths", String(oData.SelectedMonths || "1"));
            oModel.setProperty("/TodayDate", oData.TodayDate instanceof Date ? oData.TodayDate : oToday);
            oModel.setProperty("/AllSelectedFacilities", Array.isArray(oData.AllSelectedFacilities) ? oData.AllSelectedFacilities : []);
            oModel.setProperty("/TotalFacilityPrice", this._toNumber(oData.TotalFacilityPrice));
            oModel.setProperty("/CouponCode", oData.CouponCode || "");
            oModel.setProperty("/AppliedDiscount", this._toNumber(oData.AppliedDiscount));
            oModel.setProperty("/AppliedCouponCode", oData.AppliedCouponCode || "");
            oModel.setProperty("/AppliedCouponData", oData.AppliedCouponData || null);
            oModel.setProperty("/GSTType", oData.GSTType || "");
            oModel.setProperty("/GSTValue", this._toNumber(oData.GSTValue));
            oModel.setProperty("/PropertyGSTIN", oData.PropertyGSTIN || oData.GSTIN || "");
            oModel.setProperty("/GSTIN", oData.PropertyGSTIN || oData.GSTIN || "");
            oModel.setProperty("/CustomerGSTIN", oData.CustomerGSTIN || "");
            oModel.setProperty("/CompanyName", oData.CompanyName || "");
            oModel.setProperty("/CompanyAddress", oData.CompanyAddress || "");
            oModel.setProperty("/IsBusinessTravel", !!oData.IsBusinessTravel);
            oModel.setProperty("/EffectiveGSTType", oData.EffectiveGSTType || "");
            oModel.setProperty("/EffectiveGSTValue", this._toNumber(oData.EffectiveGSTValue));
            oModel.setProperty("/CustomerStateCode", oData.CustomerStateCode || "");
            oModel.setProperty("/SourceStateCode", oData.SourceStateCode || "");
            oModel.setProperty("/BookingSubTotal", this._toNumber(oData.BookingSubTotal));
            oModel.setProperty("/CGST", this._toNumber(oData.CGST));
            oModel.setProperty("/SGST", this._toNumber(oData.SGST));
            oModel.setProperty("/IGST", this._toNumber(oData.IGST));
            oModel.setProperty("/Documents", Array.isArray(oData.Documents) ? oData.Documents : []);
            oBookingView.setProperty("/showCustomerDocumentUpload", false);
            oModel.setProperty("/BookingPayload", oData.BookingPayload || null);

            if (!oData.SelectedPriceType && aPaymentMethods.length > 0) {
                oModel.setProperty("/SelectedPriceType", aPaymentMethods[0].key);
            }

            oModel.setProperty("/SelectedPerson", String(oData.SelectedPerson || "1"));

            // Load saved members from backend-provided booking data.
            const aMemberList = Array.isArray(oData.MemberList) ? oData.MemberList : [];
            const aExistingSelectedMembers = Array.isArray(oData.FamilyMembers) ? oData.FamilyMembers : [];
            const aMasterMembers = this._mergeMembersById(aMemberList);
            const aSelectedMembers = this._mergeMembersById(aExistingSelectedMembers).map(function (oMember) {
                oMember.Selected = true;
                return oMember;
            });

            oBookingView.setProperty("/MasterMembers", aMasterMembers);
            oBookingView.setProperty("/FamilyMembers", aSelectedMembers);
            this._syncPrimaryMemberInFamilyMembers();
            this._updateSelectedPersonsFromFamily();

            this._applySelectedPlanPrice();
        },

        _prefillLoggedInUser: function () {
            const oLoginModel = sap.ui.getCore().getModel("LoginModel") || this.getView().getModel("LoginModel");
            const oHostelModel = this.getView().getModel("HostelModel");

            if (!oLoginModel || !oHostelModel) {
                return;
            }

            const oUser = oLoginModel.getData() || {};

            oHostelModel.setProperty("/UserID", oUser.UserID || oUser.EmployeeID || oHostelModel.getProperty("/UserID") || "");
            oHostelModel.setProperty("/Salutation", oUser.Salutation || oHostelModel.getProperty("/Salutation") || "Mr.");
            oHostelModel.setProperty("/STDCode", oUser.STDCode || oHostelModel.getProperty("/STDCode") || "+91");
            oHostelModel.setProperty("/Gender", oUser.Gender || oHostelModel.getProperty("/Gender") || "");
            oHostelModel.setProperty("/DateOfBirth", oUser.DateOfBirth || oUser.DateofBirth || oHostelModel.getProperty("/DateOfBirth") || "");
            oHostelModel.setProperty("/FullName", oUser.UserName || oHostelModel.getProperty("/FullName") || "");
            oHostelModel.setProperty("/CustomerEmail", oUser.EmailID || oHostelModel.getProperty("/CustomerEmail") || "");
            oHostelModel.setProperty("/MobileNo", oUser.MobileNo || oHostelModel.getProperty("/MobileNo") || "");
            oHostelModel.setProperty("/Country", oUser.Country || oHostelModel.getProperty("/Country") || "");
            oHostelModel.setProperty("/State", oUser.State || oHostelModel.getProperty("/State") || "");
            oHostelModel.setProperty("/City", oUser.City || oHostelModel.getProperty("/City") || "");
            oHostelModel.setProperty("/Address", oHostelModel.getProperty("/Address") || oUser.Address || "");
            this._syncPrimaryMemberInFamilyMembers();
        },

        _syncPropertyTypeState: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const sPropertyType = String(oModel.getProperty("/PropertyType") || "").trim();
            const bSupportsCustomerGST = this._supportsCustomerGSTOverride(sPropertyType);
            const iCapacity = Math.max(parseInt(oModel.getProperty("/Capacity"), 10) || 1, 1);
            const aOriginalOptions = this._buildKeyTextList(iCapacity);

            oBookingView.setProperty("/showGSTField", this._shouldShowGSTField(sPropertyType));
            oBookingView.setProperty("/showBusinessTravelOption", bSupportsCustomerGST);
            oBookingView.setProperty("/showBusinessGSTSection", bSupportsCustomerGST && !!oModel.getProperty("/IsBusinessTravel"));

            if (!bSupportsCustomerGST) {
                this._resetBusinessTravelData();
                oBookingView.setProperty("/showBusinessGSTSection", false);
            }

            oBookingView.setProperty("/showFamilySection", this._shouldShowFamilySection(sPropertyType, iCapacity));

            // For Hostel/PG, limit to 1 person regardless of room capacity
            const bIsSinglePersonOnly = this._isSinglePersonOnlyPropertyType(sPropertyType);
            const iMaxPersons = bIsSinglePersonOnly ? 1 : iCapacity;
            oBookingView.setProperty("/maxPersons", iMaxPersons);

            oBookingView.setProperty("/originalPersonOptions", aOriginalOptions);
            oModel.setProperty("/NoOfPersonsList", aOriginalOptions);

            this._updateSelectedPersonsFromFamily();
            this._syncSelectedFacilityPersonsWithOccupants();
        },

        _syncPlanState: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const sPlan = oModel.getProperty("/SelectedPriceType") || "";
            const bHasDuration = sPlan === "Per Month" || sPlan === "Per Year";

            oBookingView.setProperty("/showDurationSelector", bHasDuration);
            oBookingView.setProperty("/endDateEditable", sPlan === "Per Day");

            if (bHasDuration) {
                this._updateAutoEndDate();
            }
        },

        _applySelectedPlanPrice: function () {
            const oModel = this.getView().getModel("HostelModel");
            const sPlan = oModel.getProperty("/SelectedPriceType");
            let sPrice = "";

            if (sPlan === "Per Day") {
                sPrice = oModel.getProperty("/Price");
            } else if (sPlan === "Per Month") {
                sPrice = oModel.getProperty("/MonthPrice");
            } else if (sPlan === "Per Year") {
                sPrice = oModel.getProperty("/YearPrice");
            }

            oModel.setProperty("/FinalPrice", sPrice || "");
        },

        _toNumber: function (vValue) {
            const fValue = parseFloat(String(vValue === undefined || vValue === null ? "" : vValue).trim());
            return isNaN(fValue) ? 0 : fValue;
        },

        _buildKeyTextList: function (iCount) {
            return Array.from({ length: Math.max(iCount, 1) }, function (_, iIndex) {
                return {
                    key: String(iIndex + 1),
                    text: String(iIndex + 1)
                };
            });
        },

        _getFacilityImageSource: function (oFacility) {
            const mDefaultTypeImages = {
                "high-speed wi-fi": "./image/High-Speed Wi-Fi.jpg",
                "laundry service": "./image/Laundry Service.jpg",
                "ironing service": "./image/Ironing Service.jpg",
                "housekeeping": "./image/Housekeeping.jpg",
                "meals / food subscription": "./image/Meals.jpg",
                "gym membership": "./image/gym.jpg",
                "two-wheeler parking": "./image/Two-Wheeler Parking.webp",
                "four-wheeler parking": "./image/Four Wheeler Parking.jpg",
                "locker / storage facility": "./image/locker.jpg",
                "power backup": "./image/Power Backup.jpeg",
                "air conditioner": "./image/Air Conditioner.jpeg",
                "room heater": "./image/Room Heater.jpeg",
                "study room access": "./image/Study Room.png",
                "extra bed": "./image/ExtraBed.jpg",
                "extra pillow": "../image/pillow.jpg"

            };
            const sTypeKey = String(oFacility.Type || "").toLowerCase().trim();
            const sFallback = mDefaultTypeImages[sTypeKey] || "./image/Fallback.png";
            const sBase64 = String(oFacility.Photo1 || "").replace(/\s/g, "");

            if (!sBase64) {
                return sFallback;
            }

            if (!sBase64.startsWith("data:image")) {
                return "data:" + (oFacility.Photo1Type || "image/jpeg") + ";base64," + sBase64;
            }

            return sBase64;
        },



        onFacilityNext: function () {
            var aFacilities = this.getView().getModel("FacilityModel").getProperty("/Facilities") || [];
            var iPageSize = this._getVisibleCardCount();
            this._iFacilityPageSize = iPageSize;
            var iMaxStart = Math.max(aFacilities.length - iPageSize, 0);

            this._iFacilityStartIndex = Math.min((this._iFacilityStartIndex || 0) + iPageSize, iMaxStart);
            this._renderFacilityCards();
        },

        onFacilityPrev: function () {
            var iPageSize = this._getVisibleCardCount();
            this._iFacilityPageSize = iPageSize;
            this._iFacilityStartIndex = Math.max((this._iFacilityStartIndex || 0) - iPageSize, 0);
            this._renderFacilityCards();
        },


        onFacilityCardPress: function (oFacility, oCard, oEvent) {
            this._openFacilitySelectionDialog(oFacility, oCard);
        },
        _getBookingUnits: function () {
            const oModel = this.getView().getModel("HostelModel");
            const sPlan = oModel.getProperty("/SelectedPriceType");
            const oStartDate = this._parseDate(oModel.getProperty("/StartDate"));
            const oEndDate = this._parseDate(oModel.getProperty("/EndDate"));
            const iSelectedMonths = parseInt(oModel.getProperty("/SelectedMonths") || "1", 10) || 1;
            let iDays = 1;

            if (sPlan === "Per Day") {
                if (oStartDate && oEndDate && oEndDate > oStartDate) {
                    iDays = Math.floor((oEndDate - oStartDate) / 86400000);
                } else {
                    iDays = 0;
                }
            }

            return {
                days: iDays,
                months: iSelectedMonths,
                years: iSelectedMonths
            };
        },

        onRoomPlanChange: function (oEvent) {
            const oModel = this.getView().getModel("HostelModel");

            oModel.setProperty("/SelectedPriceType", oEvent.getSource().getSelectedKey());
            oModel.setProperty("/SelectedMonths", "1");
            oModel.setProperty("/StartDate", "");
            oModel.setProperty("/EndDate", "");
            oModel.setProperty("/TotalDays", 0);
            this._clearSelectedFacilities();
            this._applySelectedPlanPrice();
            this._syncPlanState();
            this._applyFacilityPriceFilter();
            this._refreshCouponAndSummary({ checkDateWindow: true });
        },

        onDurationChange: function (oEvent) {
            const oModel = this.getView().getModel("HostelModel");
            oModel.setProperty("/SelectedMonths", oEvent.getSource().getSelectedKey() || "1");
            this._updateAutoEndDate();
            this._rebuildSelectedFacilities();
            this._refreshCouponAndSummary({ checkDateWindow: true });
        },

        _isLiveDateInputEvent: function (oEvent) {
            return !!(oEvent && typeof oEvent.getId === "function" && oEvent.getId() === "liveChange");
        },

        onStartDateChange: function (oEvent) {
            if (this._isLiveDateInputEvent(oEvent)) {
                return;
            }

            utils._LCvalidateDate(oEvent);
            const oModel = this.getView().getModel("HostelModel");
            const sStartDate = oModel.getProperty("/StartDate");
            const oStartDate = this._parseDate(sStartDate);
            const oToday = new Date(oModel.getProperty("/TodayDate"));
            const sPlan = oModel.getProperty("/SelectedPriceType");

            oToday.setHours(0, 0, 0, 0);

            if (sStartDate && (!oStartDate || oStartDate < oToday)) {
                MessageToast.show("Start date cannot be before today");
                oModel.setProperty("/StartDate", "");
                oModel.setProperty("/EndDate", "");
                this._rebuildSelectedFacilities();
                this._refreshCouponAndSummary({ checkDateWindow: true });
                return;
            }

            if (sPlan === "Per Month" || sPlan === "Per Year") {
                this._updateAutoEndDate();
            }

            this._rebuildSelectedFacilities();
            this._refreshCouponAndSummary({ checkDateWindow: true });
        },

        onEndDateChange: function (oEvent) {
            if (this._isLiveDateInputEvent(oEvent)) {
                return;
            }

            utils._LCvalidateDate(oEvent)
            const oModel = this.getView().getModel("HostelModel");
            const oStartDate = this._parseDate(oModel.getProperty("/StartDate"));
            const oEndDate = this._parseDate(oModel.getProperty("/EndDate"));

            if (oModel.getProperty("/SelectedPriceType") === "Per Day" && oStartDate && oEndDate && oEndDate <= oStartDate) {
                MessageToast.show("End date must be after start date");
                oModel.setProperty("/EndDate", "");
                oModel.setProperty("/TotalDays", 0);
                this._rebuildSelectedFacilities();
                this._refreshCouponAndSummary({ checkDateWindow: true });
                return;
            }

            this._rebuildSelectedFacilities();
            this._refreshCouponAndSummary({ checkDateWindow: true });
        },

        _updateAutoEndDate: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oStartDate = this._parseDate(oModel.getProperty("/StartDate"));
            const sPlan = oModel.getProperty("/SelectedPriceType");
            const iDuration = parseInt(oModel.getProperty("/SelectedMonths") || "1", 10) || 1;
            let oEndDate;

            if (!oStartDate) {
                oModel.setProperty("/EndDate", "");
                return;
            }

            oEndDate = new Date(oStartDate);

            if (sPlan === "Per Month") {
                oEndDate.setMonth(oEndDate.getMonth() + iDuration);
                oEndDate.setDate(oEndDate.getDate() - 1);
            } else if (sPlan === "Per Year") {
                oEndDate.setFullYear(oEndDate.getFullYear() + iDuration);
                oEndDate.setDate(oEndDate.getDate() - 1);
            } else {
                return;
            }

            oModel.setProperty("/EndDate", this._formatDateToDDMMYYYY(oEndDate));
        },

        onPropertyTypeChange: function (oEvent) {

            this.getView().getModel("HostelModel").setProperty("/PropertyType", oEvent.getSource().getSelectedKey());
            this._syncPropertyTypeState();
            this._rebuildSelectedFacilities();
            this._refreshCouponAndSummary({ checkDateWindow: false });
        },
        // onPropertyChange: function (oEvent) {
        //     utils._LCstrictValidationComboBox(oEvent)
        // },
        onRoomplane: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent)
        },
        // onSalutationclick:function(oEvent){
        //     utils._LCvalidateMandatoryField(oEvent)
        // },

        onDeleteFamilyMemberRow: function (oEvent) {
            const oModel = this.getView().getModel("BookingView");
            const aPreviousOccupantIds = this._getSelectedOccupantIds();
            const oContext = oEvent.getSource().getBindingContext("BookingView");
            const sPath = oContext.getPath(); // e.g. /FamilyMembers/3
            const aMembers = oModel.getProperty("/FamilyMembers") || [];
            const iIndex = parseInt(sPath.split("/").pop(), 10);

            if (!isNaN(iIndex) && iIndex > -1) {
                aMembers.splice(iIndex, 1);
                oModel.setProperty("/FamilyMembers", aMembers);
                this._syncPrimaryMemberInFamilyMembers();
                if (this._haveOccupantsChanged(aPreviousOccupantIds)) {
                    this._clearSelectedFacilities();
                }
                oModel.refresh(true);
                this._updateSelectedPersonsFromFamily();
                this._syncSelectedFacilityPersonsWithOccupants();
                this._rebuildSelectedFacilities();
                this._refreshCouponAndSummary({ checkDateWindow: false });
                MessageToast.show("Row deleted.");
            }
        },



        _updateSelectedPersonsFromFamily: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            let iSelectedPerson = (oBookingView.getProperty("/FamilyMembers") || []).filter(function (oMember) {
                return oMember.Selected;
            }).length;

            if (iSelectedPerson < 1) {
                iSelectedPerson = 1;
            }

            oModel.setProperty("/SelectedPerson", String(iSelectedPerson));
        },

        onCouponLiveChange: function () {
            if (this.getView().getModel("HostelModel").getProperty("/AppliedCouponCode")) {
                this._resetCouponState(false);
                this._recalculateSummary();
            }
        },

        onApplyCoupon: async function () {
            const oModel = this.getView().getModel("HostelModel");
            const sEnteredCode = String(oModel.getProperty("/CouponCode") || "").trim();
            const sBranchCode = oModel.getProperty("/BranchCode");
            const fCouponBaseAmount = this._getCouponBaseAmount();
            let oMatchedCoupon;
            let fDiscountAmount = 0;

            if (!sEnteredCode) {
                MessageToast.show("Please enter coupon code");
                return;
            }

            if (fCouponBaseAmount <= 0) {
                MessageToast.show("Add dates and pricing details before applying coupon.");
                return;
            }

            try {
                this.getBusyDialog();
                const oResponse = await this.ajaxReadWithJQuery("HM_CouponBookingCount", {
                    CouponCode: sEnteredCode,
                    Status: "Active"
                });
                const aCoupons = oResponse?.data || [];

                oMatchedCoupon = aCoupons.find(function (oCoupon) {
                    var sCouponBranchCode = String(oCoupon.BranchCode || "").trim();
                    return String(oCoupon.CouponCode || "").trim() === sEnteredCode
                        && sCouponBranchCode === sBranchCode;
                });

                if (!oMatchedCoupon) {
                    oModel.setProperty("/CouponCode", "");
                    MessageToast.show("Invalid coupon code");
                    return;
                }

                if (Number(oMatchedCoupon.couponUsedCount || 0) >= Number(oMatchedCoupon.MaxUses || 0)) {
                    oModel.setProperty("/CouponCode", "");
                    MessageToast.show("This coupon cannot be applied to this booking");
                    return;
                }

                if (String(oMatchedCoupon.BranchCode || "").trim() && String(oMatchedCoupon.BranchCode || "").trim() !== String(sBranchCode || "").trim()) {
                    oModel.setProperty("/CouponCode", "");
                    MessageToast.show("This coupon is not valid for the selected branch.");
                    return;
                }

                if (this._isCouponExpired(oMatchedCoupon.EndDate)) {
                    oModel.setProperty("/CouponCode", "");
                    MessageToast.show("Coupon is expired");
                    return;
                }

                if (this._isCouponNotStarted(oMatchedCoupon.StartDate)) {
                    oModel.setProperty("/CouponCode", "");
                    MessageToast.show("Coupon is not active yet");
                    return;
                }

                if (fCouponBaseAmount < Number(oMatchedCoupon.MinOrderValue || 0)) {
                    const fMinOrderValue = Number(oMatchedCoupon.MinOrderValue || 0);
                    oModel.setProperty("/CouponCode", "");
                    MessageToast.show(`Minimum order value ${this.Formatter.fromatNumber(fMinOrderValue)} is required to apply this coupon.`);
                    return;
                }

                var aCouponBookingDateReasons = this._getCouponBookingDateReasons(oMatchedCoupon);
                if (aCouponBookingDateReasons.length > 0) {
                    oModel.setProperty("/CouponCode", "");
                    MessageToast.show("This coupon is not valid for the booking date.");
                    return;
                }

                if (String(oMatchedCoupon.DiscountType || "").trim().toLowerCase() === "percentage") {
                    fDiscountAmount = fCouponBaseAmount * (Number(oMatchedCoupon.DiscountValue || 0) / 100);
                    if (Number(oMatchedCoupon.UptoValue || 0) > 0 && fDiscountAmount > Number(oMatchedCoupon.UptoValue || 0)) {
                        fDiscountAmount = Number(oMatchedCoupon.UptoValue || 0);
                    }
                } else {
                    fDiscountAmount = Number(oMatchedCoupon.DiscountValue || 0);
                }

                fDiscountAmount = Math.min(fDiscountAmount, fCouponBaseAmount);

                oModel.setProperty("/AppliedDiscount", Number(fDiscountAmount.toFixed(2)));
                oModel.setProperty("/AppliedCouponCode", sEnteredCode);
                oModel.setProperty("/AppliedCouponData", oMatchedCoupon);
                this._recalculateSummary();

                let sMessage = "Coupon applied successfully";
                if (oMatchedCoupon.Description) {
                    // sMessage += ": " + oMatchedCoupon.Description;
                }
                MessageToast.show(sMessage);
            } catch (oError) {
                MessageToast.show("Error applying coupon");
            } finally {
                this.closeBusyDialog();
            }
        },

        onRemoveCoupon: function () {
            this._resetCouponState(false);
            this._recalculateSummary();
            sap.m.MessageToast.show("Coupon removed");
        },

        _resetCouponState: function (bKeepTypedValue) {
            const oModel = this.getView().getModel("HostelModel");

            if (!bKeepTypedValue) {
                oModel.setProperty("/CouponCode", "");
            }
            oModel.setProperty("/AppliedDiscount", 0);
            oModel.setProperty("/AppliedCouponCode", "");
            oModel.setProperty("/AppliedCouponData", null);
        },

        _refreshCouponAndSummary: function (mOptions) {
            this._recalculateSummary();
            if (!this._isCouponValidationReady()) {
                return;
            }

            if (this._validateCouponAfterChange(mOptions)) {
                this._recalculateSummary();
            }
        },

        _isCouponValidationReady: function () {
            var oModel = this.getView().getModel("HostelModel");
            var sPlan = String(oModel.getProperty("/SelectedPriceType") || "").trim();
            var oStartDate = this._parseDate(oModel.getProperty("/StartDate"));
            var oEndDate = this._parseDate(oModel.getProperty("/EndDate"));

            if (sPlan === "Per Day") {
                return !!(oStartDate && oEndDate && oEndDate > oStartDate);
            }

            if (sPlan === "Per Month" || sPlan === "Per Year") {
                return !!(oStartDate && oEndDate);
            }

            return true;
        },

        _showCouponInvalidMessage: function (sMessage) {
            MessageBox.show(sMessage, {
                icon: MessageBox.Icon.WARNING,
                title: "Coupon Removed",
                actions: [MessageBox.Action.OK],
                emphasizedAction: MessageBox.Action.OK
            });

            setTimeout(function () {
                var aOpenDialogs = sap.m.InstanceManager.getOpenDialogs();
                var oDialog = aOpenDialogs[aOpenDialogs.length - 1];

                if (oDialog && typeof oDialog.getButtons === "function") {
                    (oDialog.getButtons() || []).forEach(function (oButton) {
                        oButton.addStyleClass("myUnifiedBtn");
                    });
                }
            }, 0);
        },

        _getCouponBookingDateReasons: function (oCouponData) {
            var oModel = this.getView().getModel("HostelModel");
            var sBookingDate = this._formatDateToISO(oModel.getProperty("/BookingDate"));
            var sCouponStartDate = this._formatDateToISO(oCouponData && oCouponData.StartDate);
            var sCouponEndDate = this._formatDateToISO(oCouponData && oCouponData.EndDate);
            var aReasons = [];

            if (sBookingDate && sCouponStartDate && sBookingDate < sCouponStartDate) {
                aReasons.push("booking date is before coupon validity start date");
            }

            if (sBookingDate && sCouponEndDate && sBookingDate > sCouponEndDate) {
                aReasons.push("booking date is after coupon validity end date");
            }

            return aReasons;
        },

        _getCouponInvalidReasons: function (oCouponData) {
            var fCouponBaseAmount = this._getCouponBaseAmount();
            var aReasons = [];

            if (fCouponBaseAmount < Number(oCouponData.MinOrderValue || 0)) {
                aReasons.push("minimum order value is not met");
            }

            aReasons = aReasons.concat(this._getCouponBookingDateReasons(oCouponData));

            return aReasons;
        },

        _validateCouponAfterChange: function (mOptions) {
            var oModel = this.getView().getModel("HostelModel");
            var sAppliedCode = oModel.getProperty("/AppliedCouponCode");
            var oCouponData = oModel.getProperty("/AppliedCouponData");
            var fExistingDiscount = this._toNumber(oModel.getProperty("/AppliedDiscount"));

            if (!sAppliedCode || !oCouponData) {
                return false;
            }

            var fCouponBaseAmount = this._getCouponBaseAmount();
            var aReasons = this._getCouponInvalidReasons(oCouponData);

            if (aReasons.length > 0) {
                var sMessage = "The applied coupon is no longer valid: " + aReasons.join(" and ") + ". The coupon has been removed.";
                this._showCouponInvalidMessage(sMessage);
                this._resetCouponState(false);
                return true;
            } else {
                var fDiscountAmount = 0;
                if (String(oCouponData.DiscountType || "").toLowerCase() === "percentage") {
                    fDiscountAmount = fCouponBaseAmount * (Number(oCouponData.DiscountValue || 0) / 100);
                    if (Number(oCouponData.UptoValue || 0) > 0 && fDiscountAmount > Number(oCouponData.UptoValue || 0)) {
                        fDiscountAmount = Number(oCouponData.UptoValue || 0);
                    }
                } else {
                    fDiscountAmount = Number(oCouponData.DiscountValue || 0);
                }
                fDiscountAmount = Math.min(fDiscountAmount, fCouponBaseAmount);
                fDiscountAmount = Number(fDiscountAmount.toFixed(2));
                oModel.setProperty("/AppliedDiscount", fDiscountAmount);
                return fExistingDiscount !== fDiscountAmount;
            }
        },



        _calculateTaxBreakup: function (fTaxableAmount) {
            const oModel = this.getView().getModel("HostelModel");
            const sPropertyType = String(oModel.getProperty("/PropertyType") || "").trim();
            const bSupportsCustomerGST = this._supportsCustomerGSTOverride(sPropertyType);
            const sGSTType = String(oModel.getProperty("/GSTType") || "").trim();
            const fGSTValue = this._toNumber(oModel.getProperty("/GSTValue"));
            const sPropertyGSTIN = String(oModel.getProperty("/PropertyGSTIN") || oModel.getProperty("/GSTIN") || "").trim().toUpperCase();
            const sCustomerGSTIN = String(oModel.getProperty("/CustomerGSTIN") || "").trim().toUpperCase();
            let fCGST = 0;
            let fSGST = 0;
            let fIGST = 0;
            let sEffectiveGSTType = sGSTType;
            let fEffectiveGSTValue = 0;
            let sSourceStateCode = "";
            let sCustomerStateCode = "";

            if (sGSTType || fGSTValue > 0) {
                fEffectiveGSTValue = fGSTValue;

                if (bSupportsCustomerGST && this._isValidGSTINValue(sCustomerGSTIN) && this._isValidGSTINValue(sPropertyGSTIN)) {
                    sSourceStateCode = sPropertyGSTIN.substring(0, 2);
                    sCustomerStateCode = sCustomerGSTIN.substring(0, 2);

                    if (sSourceStateCode === sCustomerStateCode) {
                        sEffectiveGSTType = "CGST/SGST";
                    } else {
                        sEffectiveGSTType = "IGST";
                    }
                }

                if (sEffectiveGSTType === "CGST/SGST") {
                    const fHalfGSTValue = fEffectiveGSTValue;
                    fCGST = Number((fTaxableAmount * fHalfGSTValue / 100).toFixed(2));
                    fSGST = Number((fTaxableAmount * fHalfGSTValue / 100).toFixed(2));
                } else if (sEffectiveGSTType === "IGST") {
                    fIGST = Number((fTaxableAmount * fEffectiveGSTValue / 100).toFixed(2));
                }
            }

            return {
                CGST: fCGST,
                SGST: fSGST,
                IGST: fIGST,
                EffectiveGSTType: sEffectiveGSTType,
                EffectiveGSTValue: fEffectiveGSTValue,
                SourceStateCode: sSourceStateCode,
                CustomerStateCode: sCustomerStateCode
            };
        },

        _getCouponBaseAmount: function () {
            const oModel = this.getView().getModel("HostelModel");
            const fRoomPrice = this._toNumber(oModel.getProperty("/RoomPrice"));
            const fFacilityPrice = this._toNumber(oModel.getProperty("/TotalFacilityPrice"));

            return Number((fRoomPrice + fFacilityPrice).toFixed(2));
        },


        // _getCouponBaseAmount: function () {
        //     const oModel = this.getView().getModel("HostelModel");
        //    // const sPlan = oModel.getProperty("/SelectedPriceType");
        //     const fRoomPrice = this._toNumber(oModel.getProperty("/RoomPrice"));
        //     const fFacilityPrice = this._toNumber(oModel.getProperty("/TotalFacilityPrice"));
        //     // const iDuration = parseInt(oModel.getProperty("/SelectedMonths") || "1", 10) || 1;

        //     // if ((sPlan === "Per Month" || sPlan === "Per Year") && iDuration > 0) {
        //     //     return Number(((fRoomPrice + fFacilityPrice) / iDuration).toFixed(2));
        //     // }

        //     return Number((fRoomPrice + fFacilityPrice).toFixed(2));
        // },

        _shouldSplitOnlinePayment: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const sPlan = String(oHostelModel.getProperty("/SelectedPriceType") || "").trim();
            const iDuration = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10) || 1;

            return (sPlan === "Per Month" || sPlan === "Per Year") && iDuration > 1;
        },

        _getOnlinePaymentBaseAmount: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const fSubTotal = this._toNumber(oHostelModel.getProperty("/BookingSubTotal"));
            const iDuration = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10) || 1;

            if (this._shouldSplitOnlinePayment()) {
                return Number((fSubTotal / iDuration).toFixed(2));
            }

            return fSubTotal;
        },

        _getOnlinePaymentTaxableAmount: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const fBaseAmount = this._getOnlinePaymentBaseAmount();
            const fDiscount = this._toNumber(oHostelModel.getProperty("/AppliedDiscount"));

            return Number(Math.max(fBaseAmount - fDiscount, 0).toFixed(2));
        },

        _isCouponExpired: function (vEndDate) {
            const oToday = new Date();
            const oEndDate = new Date(vEndDate);

            return !isNaN(oEndDate.getTime()) && oEndDate.toISOString().split("T")[0] < oToday.toISOString().split("T")[0];
        },

        _isCouponNotStarted: function (vStartDate) {
            const oToday = new Date();
            const oStartDate = new Date(vStartDate);

            return !isNaN(oStartDate.getTime()) && oStartDate.toISOString().split("T")[0] > oToday.toISOString().split("T")[0];
        },

        _recalculateSummary: function () {
            const oModel = this.getView().getModel("HostelModel");
            const sPlan = oModel.getProperty("/SelectedPriceType");
            const fBasePrice = this._toNumber(oModel.getProperty("/FinalPrice"));
            const fFacilityPrice = this._toNumber(oModel.getProperty("/TotalFacilityPrice"));
            const fFacilityDiscount = this._toNumber(oModel.getProperty("/TotalFacilityDiscount") || 0);
            const fDiscount = this._toNumber(oModel.getProperty("/AppliedDiscount"));
            const iDuration = parseInt(oModel.getProperty("/SelectedMonths") || "1", 10) || 1;
            const oStartDate = this._parseDate(oModel.getProperty("/StartDate"));
            const oEndDate = this._parseDate(oModel.getProperty("/EndDate"));
            let fRoomPrice = fBasePrice;
            let iDays = 0;
            // let sRoomBreakdown = fBasePrice + " " + (oModel.getProperty("/Currency") || "");
            // let fSubTotal = 0;
            // let fDiscountedSubTotal = 0;
            // let oTaxBreakup;

            // if (sPlan === "Per Day" && oStartDate && oEndDate && oEndDate > oStartDate) {
            //     iDays = Math.floor((oEndDate - oStartDate) / 86400000);
            //     fRoomPrice = fBasePrice * iDays;
            //     sRoomBreakdown = fBasePrice + " x " + iDays + " day(s)";
            // } else if ((sPlan === "Per Month" || sPlan === "Per Year") && iDuration > 0) {
            //     fRoomPrice = fBasePrice * iDuration;
            //     sRoomBreakdown = fBasePrice + " x " + iDuration + (sPlan === "Per Month" ? " month(s)" : " year(s)");
            // }

            // oModel.setProperty("/TotalDays", iDays);
            // oModel.setProperty("/RoomBreakdownText", sRoomBreakdown + " = " + Number(fRoomPrice.toFixed(2)) + " " + (oModel.getProperty("/Currency") || ""));
            const formattedBasePrice = this.Formatter.fromatNumber(fBasePrice);
            let sRoomBreakdown = formattedBasePrice;
            let fSubTotal = 0;
            let fDiscountedSubTotal = 0;
            let oTaxBreakup;

            if (sPlan === "Per Day" && oStartDate && oEndDate && oEndDate > oStartDate) {
                iDays = Math.floor((oEndDate - oStartDate) / 86400000);
                fRoomPrice = fBasePrice * iDays;
                sRoomBreakdown = `${formattedBasePrice} x ${iDays} day(s)`;
            } else if ((sPlan === "Per Month" || sPlan === "Per Year") && iDuration > 0) {
                fRoomPrice = fBasePrice * iDuration;
                sRoomBreakdown = `${formattedBasePrice} x ${iDuration} ${sPlan === "Per Month" ? "month(s)" : "year(s)"}`;
            } else {
                fRoomPrice = fBasePrice;
            }

            oModel.setProperty("/TotalDays", iDays);
            oModel.setProperty("/RoomBreakdownText", sRoomBreakdown);
            oModel.setProperty("/RoomPrice", Number(fRoomPrice.toFixed(2)));

            // Calculate subtotal including facility discount
            fSubTotal = Number((fRoomPrice + fFacilityPrice).toFixed(2));
            // Apply facility discount first, then coupon discount
            fDiscountedSubTotal = Number(Math.max(fSubTotal - fFacilityDiscount - fDiscount, 0).toFixed(2));
            oTaxBreakup = this._calculateTaxBreakup(fDiscountedSubTotal);

            // Set model properties with proper breakdown
            oModel.setProperty("/SubTotalBeforeDiscount", fSubTotal);
            oModel.setProperty("/BookingSubTotal", fSubTotal);
            oModel.setProperty("/BookingNetSubTotal", fDiscountedSubTotal);
            oModel.setProperty("/FacilityOfferDiscountTotal", fFacilityDiscount); // Already have TotalFacilityDiscount but adding clearer name
            oModel.setProperty("/CGST", oTaxBreakup.CGST);
            oModel.setProperty("/SGST", oTaxBreakup.SGST);
            oModel.setProperty("/IGST", oTaxBreakup.IGST);
            oModel.setProperty("/EffectiveGSTType", oTaxBreakup.EffectiveGSTType);
            oModel.setProperty("/EffectiveGSTValue", oTaxBreakup.EffectiveGSTValue);
            oModel.setProperty("/SourceStateCode", oTaxBreakup.SourceStateCode);
            oModel.setProperty("/CustomerStateCode", oTaxBreakup.CustomerStateCode);
            oModel.setProperty("/GrandTotal", Number(Math.max(fDiscountedSubTotal + oTaxBreakup.CGST + oTaxBreakup.SGST + oTaxBreakup.IGST, 0).toFixed(2)));
        },

        _parseDate: function (vDate) {
            let oDate;

            if (!vDate) {
                return null;
            }

            if (vDate instanceof Date) {
                oDate = new Date(vDate);
                oDate.setHours(0, 0, 0, 0);
                return oDate;
            }

            if (typeof vDate === "string" && vDate.includes("/")) {
                const aParts = vDate.split("/");
                if (aParts.length === 3) {
                    oDate = new Date(Number(aParts[2]), Number(aParts[1]) - 1, Number(aParts[0]));
                    oDate.setHours(0, 0, 0, 0);
                    return isNaN(oDate.getTime()) ? null : oDate;
                }
            }

            oDate = new Date(vDate);
            if (isNaN(oDate.getTime())) {
                return null;
            }

            oDate.setHours(0, 0, 0, 0);
            return oDate;
        },

        _formatDateToDDMMYYYY: function (oDate) {
            if (!(oDate instanceof Date) || isNaN(oDate.getTime())) {
                return "";
            }

            return [
                String(oDate.getDate()).padStart(2, "0"),
                String(oDate.getMonth() + 1).padStart(2, "0"),
                oDate.getFullYear()
            ].join("/");
        },

        formatDocumentFileName: function (sFileName) {
            const sName = String(sFileName || "").trim();

            if (sName.length <= 15) {
                return sName;
            }

            return sName.slice(0, 15) + "...";
        },

        formatFacilityTotal: function (vTotalAmount, sCurrency) {
            return this._toNumber(vTotalAmount) + (sCurrency ? " " + sCurrency : "");
        },

        _formatDateToISO: function (vDate) {
            const oDate = this._parseDate(vDate);

            if (!oDate) {
                return "";
            }

            return [
                oDate.getFullYear(),
                String(oDate.getMonth() + 1).padStart(2, "0"),
                String(oDate.getDate()).padStart(2, "0")
            ].join("-");
        },

        _getTodayISODate: function () {
            return this._formatDateToISO(new Date());
        },

        _formatBedTypeText: function () {
            const oModel = this.getView().getModel("HostelModel");
            const aParts = [
                String(oModel.getProperty("/BedType") || "").trim(),
                String(oModel.getProperty("/ACType") || "").trim()
            ].filter(Boolean);

            return aParts.join(" - ");
        },

        _getBranchName: function () {
            const oModel = this.getView().getModel("HostelModel");

            return String(
                oModel.getProperty("/BranchName") ||
                oModel.getProperty("/Area") ||
                oModel.getProperty("/Branch") ||
                ""
            ).trim();
        },

        _getPayableNowAmount: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const fGrandTotal = this._toNumber(oHostelModel.getProperty("/GrandTotal"));
            const fTaxableAmount = this._getOnlinePaymentTaxableAmount();
            const oTaxBreakup = this._calculateTaxBreakup(fTaxableAmount);
            const fPayableNow = Number(Math.max(
                fTaxableAmount + oTaxBreakup.CGST + oTaxBreakup.SGST + oTaxBreakup.IGST,
                0
            ).toFixed(2));

            if (!this._shouldSplitOnlinePayment()) {
                return fGrandTotal;
            }

            return fPayableNow;
        },

        _getRemainingBalanceAmount: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const fGrandTotal = this._toNumber(oHostelModel.getProperty("/GrandTotal"));
            const fPayableNow = this._getPayableNowAmount();

            return Number(Math.max(fGrandTotal - fPayableNow, 0).toFixed(2));
        },

        _syncPaymentModel: function (sPaymentType) {
            const oPaymentModel = this.getView().getModel("PaymentModel");
            const sResolvedType = sPaymentType || oPaymentModel.getProperty("/PaymentType") || "PayOnCheckIn";
            const fPayableNow = this._getPayableNowAmount();
            const fRemainingBalance = this._getRemainingBalanceAmount();

            oPaymentModel.setProperty("/PaymentType", sResolvedType);
            oPaymentModel.setProperty("/PayableNow", fPayableNow);
            oPaymentModel.setProperty("/RemainingBalance", fRemainingBalance);
            oPaymentModel.setProperty("/Amount", sResolvedType === "PayOnCheckIn" ? 0 : fPayableNow);
            oPaymentModel.setProperty("/PaymentDate", sResolvedType === "PayOnCheckIn" ? "" : this._formatDateToDDMMYYYY(new Date()));

            if (sResolvedType === "PayOnCheckIn") {
                oPaymentModel.setProperty("/BankTransactionID", "");
            }
        },

        _togglePaymentSections: function (bShowUPI, bShowCard, bPayOnCheckIn) {
            const oUPISection = sap.ui.getCore().byId("idUPISection");
            const oCardSection = sap.ui.getCore().byId("idCardSection");
            const oRightPanel = sap.ui.getCore().byId("idRightPanel");

            if (oUPISection) {
                oUPISection.setVisible(bShowUPI);
            }

            if (oCardSection) {
                oCardSection.setVisible(bShowCard);
            }

            if (oRightPanel) {
                oRightPanel.setVisible(!bPayOnCheckIn);
            }
        },

        _getSelectedPaymentOption: function () {
            const oGroup = sap.ui.getCore().byId("idPaymentTypeGroup");

            return oGroup && oGroup.getSelectedIndex() === 1 ? "UPI" : "PayOnCheckIn";
        },

        _ensurePaymentDialog: async function () {
            if (!this._pPaymentDialog) {
                this._pPaymentDialog = Fragment.load({
                    name: "sap.ui.com.project1.fragment.PaymentPage",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this._oPaymentDialog = await this._pPaymentDialog;
            return this._oPaymentDialog;
        },

        _getPaymentPayloadDetails: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const oPaymentModel = this.getView().getModel("PaymentModel");
            const sPaymentType = oPaymentModel.getProperty("/PaymentType") || "PayOnCheckIn";
            const aFamilyMembers = oBookingView.getProperty("/FamilyMembers") || [];
            const sPrimaryOccupantName = this.formatPrimaryOccupantName(aFamilyMembers) || oHostelModel.getProperty("/FullName") || "";

            if (sPaymentType === "PayOnCheckIn") {
                return {
                    Amount: 0,
                    PaymentType: "PayOnCheckIn",
                    BankTransactionID: "",
                    Date: this._getTodayISODate(),
                    BranchCode: oHostelModel.getProperty("/BranchCode") || "",
                    CustomerName: sPrimaryOccupantName,
                    Currency: oHostelModel.getProperty("/Currency") || "INR",
                    BranchName: this._getBranchName(),
                    BankName: "PayOnCheckIn"
                };
            }

            return {
                Amount: this._toNumber(oPaymentModel.getProperty("/Amount")) || this._getPayableNowAmount(),
                PaymentType: sPaymentType,
                BankTransactionID: String(oPaymentModel.getProperty("/BankTransactionID") || "").trim(),
                Date: this._formatDateToISO(oPaymentModel.getProperty("/PaymentDate")) || this._getTodayISODate(),
                BranchCode: oHostelModel.getProperty("/BranchCode") || "",
                CustomerName: sPrimaryOccupantName,
                Currency: oHostelModel.getProperty("/Currency") || "INR",
                BranchName: this._getBranchName(),
                BankName: sPaymentType
            };
        },

        _getSelectedMemberIDs: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const aFamilyMembers = oBookingView.getProperty("/FamilyMembers") || [];
            const sUserID = oHostelModel.getProperty("/UserID") || "";

            // UserID cannot be empty - if empty, return empty string
            if (!sUserID) {
                return "";
            }

            // Find all selected members (including SELF if selected)
            const aSelectedMembers = aFamilyMembers.filter(function (oMember) {
                return oMember.Selected === true;
            });

            // Check if SELF is selected
            const oSelfMember = aSelectedMembers.find(function (oMember) {
                const sRelation = String(oMember.Relation || "").trim().toLowerCase();
                return sRelation === "self" || oMember.id === "SELF";
            });
            const bSelfSelected = !!oSelfMember;

            // Find primary member among selected members
            let oPrimaryMember = null;
            const aOtherSelected = [];

            aSelectedMembers.forEach(function (oMember) {
                if (oMember.IsPrimary) {
                    oPrimaryMember = oMember;
                } else {
                    aOtherSelected.push(oMember);
                }
            });

            // Determine if primary is SELF
            let bPrimaryIsSelf = false;
            if (oPrimaryMember) {
                const sRelation = String(oPrimaryMember.Relation || "").trim().toLowerCase();
                bPrimaryIsSelf = sRelation === "self" || oPrimaryMember.id === "SELF";
            }

            // Build MemberID array
            const aMemberIDs = [];

            // 1. Primary member at index 0 (if exists and is selected)
            if (oPrimaryMember) {
                if (bPrimaryIsSelf) {
                    // Primary is SELF and selected - use UserID at index 0
                    aMemberIDs.push(sUserID);
                } else {
                    // Primary is someone else - use their MemberID at index 0
                    const sPrimaryMemberID = oPrimaryMember.MemberID || "";
                    aMemberIDs.push(sPrimaryMemberID);
                }
            }

            // 2. Include UserID for SELF only if SELF is selected and not already added as primary
            if (bSelfSelected && !bPrimaryIsSelf) {
                // SELF is selected but not primary - insert after primary (at index 1) or at index 0 if no primary
                if (aMemberIDs.length > 0) {
                    aMemberIDs.splice(1, 0, sUserID);
                } else {
                    aMemberIDs.push(sUserID);
                }
            }
            // If SELF is not selected, UserID is NOT added at all

            // 3. Add other selected members (excluding SELF which is already handled)
            aOtherSelected.forEach(function (oMember) {
                // Skip SELF (already handled above)
                const sRelation = String(oMember.Relation || "").trim().toLowerCase();
                const bIsSelf = sRelation === "self" || oMember.id === "SELF";
                if (bIsSelf) {
                    return;
                }
                const sMemberID = oMember.MemberID || "";
                if (sMemberID) {
                    aMemberIDs.push(sMemberID);
                }
            });

            // Filter out empty strings and join with commas
            return aMemberIDs.filter(function (s) { return s && s.trim(); }).join(",");
        },

        _getFacilityMemberIdValue: function (oFacility) {
            return "";
        },

        _getFacilityMemberRecord: function (sPersonId) {
            const oBookingView = this.getView().getModel("BookingView");
            const aMembers = oBookingView ? (oBookingView.getProperty("/FamilyMembers") || []) : [];

            if (!sPersonId || sPersonId === "SELF") {
                return null;
            }

            return aMembers.find(function (oMember) {
                return oMember.id === sPersonId || oMember.MemberID === sPersonId;
            }) || null;
        },

        _isNamedFamilyMemberFacilityPerson: function (sPersonId) {
            const oMember = this._getFacilityMemberRecord(sPersonId);

            return !!(
                sPersonId &&
                sPersonId !== "SELF" &&
                oMember &&
                oMember.Selected &&
                String(oMember.Name || "").trim()
            );
        },

        _getFacilityFlagValue: function (sPersonId) {
            return this._isNamedFamilyMemberFacilityPerson(sPersonId) ? "X" : "";
        },

        _getFacilityMemberIdentity: function (sPersonId, sFallbackName) {
            const oHostelModel = this.getView().getModel("HostelModel");
            const oMember = this._getFacilityMemberRecord(sPersonId);

            if (sPersonId === "SELF") {
                return {
                    MemberID: String(oHostelModel.getProperty("/UserID") || "").trim(),
                    MemberName: String(oHostelModel.getProperty("/FullName") || sFallbackName || "Primary Guest").trim()
                };
            }

            return {
                MemberID: String(oMember && oMember.MemberID || "").trim(),
                MemberName: String(oMember && oMember.Name || sFallbackName || "").trim()
            };
        },

        _buildFacilityPayloadRows: function (oFacility, oHostelModel) {
            const sSelectionMode = String(oFacility.SelectionMode || "").toUpperCase().trim();
            const sStartDate = this._formatDateToISO(oHostelModel.getProperty("/StartDate"));
            const sEndDate = this._formatDateToISO(oHostelModel.getProperty("/EndDate"));
            // const sCustomerID = oHostelModel.getProperty("/CustomerID") || "";
            const sCurrency = oFacility.Currency || oHostelModel.getProperty("/Currency") || "INR";
            const sUnitText = oFacility.UnitText || oFacility.SelectedPriceType || oHostelModel.getProperty("/SelectedPriceType") || "";
            const fUnitPrice = this._toNumber(oFacility.Price || oFacility.SelectedPrice || oFacility.UnitPrice || 0);
            const sChargeType = oFacility.FacilityChargeType || "";
            const aSelectedPersonIds = Array.isArray(oFacility.SelectedPersonIds) ? oFacility.SelectedPersonIds : [];
            const aPersonQuantities = Array.isArray(oFacility.PersonQuantities) ? oFacility.PersonQuantities : [];
            const iChargeableDays = sChargeType === "DAILY" ? this._getFacilityChargeableDayCount() : 0;
            const oUnits = this._getBookingUnits();
            const fnGetPeriodMultiplier = function (sPriceType) {
                if (sPriceType === "Per Day") {
                    return oUnits.days || 1;
                }
                if (sPriceType === "Per Month") {
                    return oUnits.months || 1;
                }
                if (sPriceType === "Per Year") {
                    return oUnits.years || 1;
                }
                return 1;
            };
            const fPeriodMultiplier = fnGetPeriodMultiplier(sUnitText);
            const fnCreateBaseRow = function () {
                return {
                    FacilityID: "",
                    FacilityName: oFacility.FacilityName || "",
                    StartDate: sStartDate,
                    EndDate: sEndDate,
                    PaidStatus: "Pending",
                    // CustomerID: sCustomerID,
                    MemberID: "",
                    MemberName: "",
                    SelectionMode: oFacility.SelectionMode || "",
                    FacilityChargeType: sChargeType,
                    Quantity: "",
                    UnitText: sUnitText,
                    Currency: sCurrency,
                    UnitPrice: fUnitPrice.toFixed(2),
                    BasicFacilityPrice: fUnitPrice.toFixed(2),
                    FacilitiPrice: "0.00"
                };
            };

            if (sSelectionMode === "PERSON") {
                return aSelectedPersonIds.map(function (sPersonId) {
                    const oIdentity = this._getFacilityMemberIdentity(sPersonId);
                    const oRow = fnCreateBaseRow();

                    oRow.MemberID = oIdentity.MemberID;
                    oRow.MemberName = oIdentity.MemberName;
                    oRow.FacilitiPrice = (fUnitPrice * fPeriodMultiplier).toFixed(2);
                    return oRow;
                }.bind(this));
            }

            if (sSelectionMode === "PERSON_QTY") {
                const fPackagePrice = this._toNumber(
                    oFacility.MinimumPrice || oFacility.SelectedPrice || oFacility.CurrentPrice || fUnitPrice
                );

                return aPersonQuantities.filter(function (oLine) {
                    return (parseInt(oLine.qty, 10) || 0) > 0;
                }).map(function (oLine) {
                    const iQty = Math.max(parseInt(oLine.qty, 10) || 0, 0);
                    const oIdentity = this._getFacilityMemberIdentity(oLine.personId, oLine.personName);
                    const oRow = fnCreateBaseRow();
                    const fRowTotal = sChargeType === "DAILY"
                        ? (fPackagePrice * iChargeableDays)
                        : fPackagePrice;

                    oRow.MemberID = oIdentity.MemberID;
                    oRow.MemberName = oIdentity.MemberName;
                    oRow.Quantity = iQty;
                    oRow.BasicFacilityPrice = fPackagePrice.toFixed(2);
                    oRow.FacilitiPrice = fRowTotal.toFixed(2);
                    return oRow;
                }.bind(this));
            }

            if (sSelectionMode === "QTY") {
                const oRow = fnCreateBaseRow();
                const iQty = Math.max(parseInt(oFacility.Quantity, 10) || 1, 1);

                oRow.Quantity = iQty;
                oRow.FacilitiPrice = this._toNumber(oFacility.TotalAmount).toFixed(2);
                return [oRow];
            }

            const oRow = fnCreateBaseRow();
            if (sSelectionMode !== "SINGLE") {
                oRow.Quantity = Math.max(parseInt(oFacility.Quantity, 10) || 1, 1);
            }
            oRow.FacilitiPrice = this._toNumber(oFacility.TotalAmount).toFixed(2);
            return [oRow];
        },

        _buildFacilityItemsPayload: function () {
            const oHostelModel = this.getView().getModel("HostelModel");

            return (oHostelModel.getProperty("/AllSelectedFacilities") || []).reduce(function (aItems, oFacility) {
                return aItems.concat(this._buildFacilityPayloadRows(oFacility, oHostelModel));
            }.bind(this), []);
        },

        _buildBookingItemsPayload: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const bIsBusinessTravel = !!oHostelModel.getProperty("/IsBusinessTravel");
            const sCustomerGSTIN = String(oHostelModel.getProperty("/CustomerGSTIN") || "").trim().toUpperCase();
            const sCompanyName = String(oHostelModel.getProperty("/CompanyName") || "").trim();
            const sCompanyAddress = String(oHostelModel.getProperty("/CompanyAddress") || "").trim();
            const sEffectiveGSTType = oHostelModel.getProperty("/EffectiveGSTType") || oHostelModel.getProperty("/GSTType") || "";
            const sPropertyGSTIN = oHostelModel.getProperty("/PropertyGSTIN") || oHostelModel.getProperty("/GSTIN") || "";
            const aFamilyMembers = oBookingView.getProperty("/FamilyMembers") || [];
            const sPrimaryOccupantName = this.formatPrimaryOccupantName(aFamilyMembers) || oHostelModel.getProperty("/FullName") || "";

            // Find primary occupant's salutation
            let sPrimarySalutation = oHostelModel.getProperty("/Salutation") || "Mr.";
            const oPrimary = aFamilyMembers.find(function (oMember) {
                return oMember && oMember.IsPrimary === true;
            });
            if (oPrimary && oPrimary.Salutation) {
                sPrimarySalutation = oPrimary.Salutation;
            }

            return [{
                BookingDate: this._getTodayISODate(),
                RentPrice: this._toNumber(oHostelModel.getProperty("/GrandTotal")).toFixed(2),
                RoomPrice: this._toNumber(oHostelModel.getProperty("/FinalPrice")).toFixed(2),
                NoOfPersons: this._getSelectedPersonCount(),
                StartDate: this._formatDateToISO(oHostelModel.getProperty("/StartDate")),
                EndDate: this._formatDateToISO(oHostelModel.getProperty("/EndDate")),
                Status: "New",
                PropertyType: oHostelModel.getProperty("/PropertyType") || "",
                PaymentType: oHostelModel.getProperty("/SelectedPriceType") || "",
                BedType: this._formatBedTypeText(),
                BranchCode: oHostelModel.getProperty("/BranchCode") || "",
                Currency: oHostelModel.getProperty("/Currency") || "INR",
                Discount: this._toNumber(oHostelModel.getProperty("/AppliedDiscount")).toFixed(2),
                CouponCode: oHostelModel.getProperty("/AppliedCouponCode") || "",
                TotalRoomprice: this._toNumber(oHostelModel.getProperty("/RoomPrice")).toFixed(2),
                UserID: oHostelModel.getProperty("/UserID") || "",
                GSTType: sEffectiveGSTType,
                GSTValue: String(this._toNumber(oHostelModel.getProperty("/EffectiveGSTValue") || oHostelModel.getProperty("/GSTValue"))),
                GSTIN: sPropertyGSTIN,
                CustomerName: sPrimaryOccupantName,
                // Salutation: sPrimarySalutation,
                CustomerGSTIN: bIsBusinessTravel ? sCustomerGSTIN : "",
                CustCompanyName: bIsBusinessTravel ? sCompanyName : "",
                CustCompanyAddress: bIsBusinessTravel ? sCompanyAddress : "",
                MemberID: this._getSelectedMemberIDs()
            }];
        },

        _buildBookingCreatePayload: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const aFamilyMembers = oBookingView.getProperty("/FamilyMembers") || [];
            // Get logged-in user's name from LoginModel (SELF)
            const oLoginModel = sap.ui.getCore().getModel("LoginModel");
            const oUser = oLoginModel ? oLoginModel.getData() || {} : {};
            const sLoggedInUserName = oUser.UserName || oHostelModel.getProperty("/FullName") || "";
            const sPrimaryOccupantName = this.formatPrimaryOccupantName(aFamilyMembers) || oHostelModel.getProperty("/FullName") || "";


            return {
                data: [{
                    Salutation: oHostelModel.getProperty("/Salutation") || "Mr.",
                    CustomerName: sPrimaryOccupantName,
                    UserID: oHostelModel.getProperty("/UserID") || "",
                    STDCode: oHostelModel.getProperty("/STDCode") || "+91",
                    MobileNo: oHostelModel.getProperty("/MobileNo") || "",
                    Gender: oHostelModel.getProperty("/Gender") || "",
                    DateOfBirth: this._formatDateToISO(oHostelModel.getProperty("/DateOfBirth")),
                    CustomerEmail: oHostelModel.getProperty("/CustomerEmail") || "",
                    Country: oHostelModel.getProperty("/Country") || "",
                    State: oHostelModel.getProperty("/State") || "",
                    City: oHostelModel.getProperty("/City") || "",
                    PermanentAddress: oHostelModel.getProperty("/Address") || "",
                    Documents: [],
                    Booking: this._buildBookingItemsPayload(),
                    FacilityItems: this._buildFacilityItemsPayload(),
                    Deposit:oHostelModel.getProperty("/Deposit") || 0,
                    // PaymentDetails: [this._getPaymentPayloadDetails()]
                    PaymentDetails: (this.getView().getModel("PaymentModel").getProperty("/PaymentType") || "PayOnCheckIn") === "PayOnCheckIn" ? [] : [this._getPaymentPayloadDetails()]
                }]
            };
        },

        // onChangeFullname: function (oEvent) {
        //     utils._LCvalidateMandatoryField(oEvent)
        // },

        _validateBookingBeforePayment: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const sPropertyType = String(oModel.getProperty("/PropertyType") || "").trim();
            const bSupportsCustomerGST = this._supportsCustomerGSTOverride(sPropertyType);
            const bIsBusinessTravel = !!oModel.getProperty("/IsBusinessTravel");
            const sCustomerGSTIN = String(oModel.getProperty("/CustomerGSTIN") || "").trim();
            const sCompanyName = String(oModel.getProperty("/CompanyName") || "").trim();
            const sCompanyAddress = String(oModel.getProperty("/CompanyAddress") || "").trim();

            var isMandatoryValid = (
                !!sPropertyType &&
                utils._LCstrictValidationComboBox(this.getView().byId(("BookRoom_ID")), "ID") &&
                utils._LCvalidateDate(this.getView().byId(("BookStartdate_ID")), "ID") &&
                utils._LCvalidateDate(this.getView().byId(("BookEnddate_ID")), "ID")

            )
            if (!isMandatoryValid) {
                MessageToast.show("Please fill mandatory booking details");
                return false;
            }

            if ((oBookingView.getProperty("/FamilyMembers") || []).filter(function (oMember) {
                return !!oMember.Selected;
            }).length < 1) {
                MessageToast.show("Please select at least one member from the member list.");
                return false;
            }

            // if (!oModel.getProperty("/FullName") || !oModel.getProperty("/StartDate") || !oModel.getProperty("/EndDate")) {
            //     MessageToast.show("Please fill mandatory booking details");
            //     return false;
            // }

            if (!oModel.getProperty("/CustomerEmail") || !oModel.getProperty("/MobileNo")) {
                MessageToast.show("Please complete contact details before payment");
                return false;
            }


            if (bSupportsCustomerGST && bIsBusinessTravel) {
                var isGStvalidate = (
                    utils._LCvalidateGstNumber(this.getView().byId(("BookGst_ID")), "ID") && utils._LCvalidateMandatoryField(this.getView().byId(("BookCompanyname_ID")), "ID") && utils._LCvalidateMandatoryField(this.getView().byId(("BookconpanyAddress_ID")), "ID")
                )

                if (!isGStvalidate) {
                    MessageToast.show("Please fill business GST details");
                    return false;
                }

                if (!this._isValidGSTINValue(sCustomerGSTIN)) {
                    MessageToast.show("Please enter a valid GSTIN");
                    return false;
                }
            }

            return true;
        },

        onPaymentTypeSelect: function (oEvent) {
            const iSelectedIndex = oEvent.getSource().getSelectedIndex();
            const bPayOnCheckIn = iSelectedIndex === 0;
            const bUPI = iSelectedIndex === 1;
            this._togglePaymentSections(bUPI, false, bPayOnCheckIn);
            this._syncPaymentModel(bUPI ? "UPI" : "PayOnCheckIn");
        },

        onPaymentClose: function () {
            const oPaymentModel = this.getView().getModel("PaymentModel");

            if (oPaymentModel) {
                oPaymentModel.setProperty("/BankTransactionID", "");
            }

            if (this._oPaymentDialog) {
                this._oPaymentDialog.close();
            }
            const aFields = [
                "idTransactionID"
            ];
            aFields.forEach(id => {
                const oField = sap.ui.getCore().byId(id);
                if (oField) {
                    oField.setValue("");
                    oField.setValueState("None");
                    oField.setValueStateText("");
                }
            })

        },

        onTransactionIDChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = String(oInput.getValue() || "").trim();

            this.getView().getModel("PaymentModel").setProperty("/BankTransactionID", sValue);
            utils._LCvalidateMandatoryField(oEvent);

            if (!sValue) {
                oInput.setValueState("None");
            }
        },

        onPaymentDateChange: function (oEvent) {
            const oInput = oEvent.getSource();

            if (!oInput.getValue()) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Select payment date");
                return;
            }

            oInput.setValueState("None");
        },

        onSubmitPress: async function () {
            const oPaymentModel = this.getView().getModel("PaymentModel");
            const bPayOnCheckIn = (oPaymentModel.getProperty("/PaymentType") || "PayOnCheckIn") === "PayOnCheckIn";

            if (!bPayOnCheckIn) {
                const bValidPaymentFields = (
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idTransactionID"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("idPaymentDate"), "ID")
                );

                if (!bValidPaymentFields) {
                    MessageToast.show("Please complete payment verification details");
                    return;
                }
            }

            try {
                const oHostelModel = this.getView().getModel("HostelModel");
                this.getBusyDialog();

                const oPayloadData = this._buildBookingCreatePayload();
                const oMainData = oPayloadData.data[0];

                const pdfBase64 = await this.onGeneratePDF(oMainData);
                delete oPayloadData.data[0].Deposit;

                const oHostelData = oHostelModel.getData();
                oPayloadData.data[0].Area = oHostelData.Area || "";
                oPayloadData.data[0].PropertySTD = oHostelData.PropertySTD || "";
                oPayloadData.data[0].PropertyMobileNo = oHostelData.PropertyMobileNo || "";
                oPayloadData.data[0].PropertyEmail = oHostelData.PropertyEmail || "";
                const oPayload = {
                    data: oPayloadData.data,
                    pdfAttachment: {
                        fileName: "BookingVoucher.pdf",
                        mimeType: "application/pdf",
                        content: pdfBase64
                    }
                };
                const oResponse = await this.ajaxCreateWithJQuery("HM_Customer", oPayload);
                const aBookingDetails = oResponse && oResponse.BookingDetails ? oResponse.BookingDetails : [];
                // let sMessage = "Booking created successfully.";
                let sMessage = "Thank you! Your booking request has been received.\n\n" +
                    "We are checking room availability, and the confirmation status will be emailed to you shortly";

                oHostelModel.setProperty("/BookingPayload", oPayload);

                if (aBookingDetails.length) {
                    sMessage += "\n\n" + aBookingDetails.map(function (oItem) {
                        return "Booking Reference No: " + oItem.BookingID;
                    }).join("\n");
                }

                if (this._oPaymentDialog) {
                    this._oPaymentDialog.close();
                }

                MessageBox.success(sMessage, {
                    title: "Booking Request Received",
                    styleClass: "myUnifiedBtn",
                    contentWidth: "500px",
                    onClose: function () {
                        const sUserID = oHostelModel.getProperty("/UserID");

                        if (sUserID) {
                            this.getOwnerComponent().getRouter().navTo("RouteManageProfile");
                            return;
                        }

                        this.getOwnerComponent().getRouter().navTo("RouteHostel");
                    }.bind(this)
                })
            } catch (oError) {
                let sErrorMessage = "Unable to create booking.";

                if (oError && oError.responseJSON) {
                    sErrorMessage = oError.responseJSON.message || oError.responseJSON.error || sErrorMessage;
                } else if (oError && oError.responseText) {
                    try {
                        const oParsedError = JSON.parse(oError.responseText);
                        sErrorMessage = oParsedError.message || oParsedError.error || sErrorMessage;
                    } catch (e) {
                        sErrorMessage = oError.responseText || sErrorMessage;
                    }
                } else if (oError && oError.message) {
                    sErrorMessage = oError.message;
                }

                MessageBox.error(sErrorMessage);
            } finally {
                this.closeBusyDialog();
            }
        },

        onGeneratePDF: async function (data) {
            const booking = data.Booking?.[0] || {};
            const facilities = data.FacilityItems || [];
            const oHostelModel =
            this.getView().getModel("HostelModel").getData() || {};

            let filter = { BranchID: [booking.BranchCode] };
            const oCompanyDetailsModel = await this.ajaxReadWithJQuery(
            "HM_Branch",
            filter,
            );
            const company = oCompanyDetailsModel.data[0] || {};
            const checkinTime = company.CheckinTime || "11:00 AM";
            const checkoutTime = company.CheckoutTime || "10:00 PM";

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            });

            const currency = (booking.Currency || "INR").trim();
            let currentY = 15;

            const PRIMARY_COLOR = [20, 170, 183];
            const ACCENT_COLOR = [244, 185, 66];
            const LIGHT_GRAY = [245, 245, 245];
            const BORDER_LIGHT = [230, 230, 230];

            const checkNewPage = (requiredSpace = 20) => {
            if (currentY + requiredSpace > 280) {
                doc.addPage();
                currentY = 20;
                return true;
            }
            return false;
            };

            // ========== HEADER SECTION ==========
            doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.rect(0, 0, 210, 32, "F");

            doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.rect(0, 32, 210, 2.5, "F");

            // Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(255, 255, 255);
            doc.text("BOOKING VOUCHER", 20, 20);

            // Compact Right Box
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(255, 255, 255);
            doc.roundedRect(145, 9, 45, 10, 3, 3, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text(
            `Booked On: ${oHostelModel.BookingDate ? Formatter.formatDate(oHostelModel.BookingDate) : "N/A"}`,
            148,
            15,
            );

            currentY = 40;

            // ================= PROPERTY =================
            checkNewPage(50);

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.setLineWidth(0.5);
            doc.roundedRect(15, currentY, 180, 45, 5, 5, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.text(company.Name || "StayVriksha", 20, currentY + 10);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            let address = doc.splitTextToSize(company.Address || "", 130);
            doc.text(address, 20, currentY + 18);

            let contactY = currentY + 18 + address.length * 4;
            doc.setTextColor(100, 100, 100);
            doc.text(`Contact: ${company.Contact || ""}`, 20, contactY);
            doc.text(`Email: ${company.EmailID || ""}`, 20, contactY + 5);

            if (company.GeoLocation) {
            doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.textWithLink("View Property on Map", 20, contactY + 10, {
                url: company.GeoLocation,
            });
            }

            currentY += 55;

            // ================= GUEST & STAY =================
            checkNewPage(45); // Adjusted down to keep layouts together gracefully if needed

            var Memberdata =
            this.getView()
                .getModel("BookingView")
                .getProperty("/FamilyMembers") || [];
            let guestBody = [];
            let guestBoxY = currentY;

            Memberdata.forEach((member, index) => {
            guestBody.push([
                (index + 1).toString(),
                `${member.Salutation || ""} ${member.Name || "-"}`,
                member.Gender || "-",
                Formatter.formatAgeFromDOBOrAge(member.Age) || "-",
                member.Relation || "-",
            ]);
            });

            // Guest Box Background
            doc.setFillColor(...LIGHT_GRAY);
            doc.setDrawColor(...BORDER_LIGHT);
            doc.roundedRect(15, guestBoxY, 180, 25, 4, 4, "FD");

            // Accent bar
            doc.setFillColor(...ACCENT_COLOR);
            doc.rect(15, guestBoxY, 5, 25, "F");

            // Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text("GUEST DETAILS", 24, guestBoxY + 8);

            doc.autoTable({
            startY: guestBoxY + 12,
            margin: { left: 20, right: 15 },
            head: [["Sl.No", "Guest Name", "Gender", "Age", "Relation"]],
            body: guestBody,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 8,
                cellPadding: 2,
                lineColor: [220, 220, 220],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: PRIMARY_COLOR,
                textColor: [255, 255, 255],
                fontStyle: "bold",
                halign: "center",
            },
            columnStyles: {
                0: { cellWidth: 15, halign: "center" },
                1: { cellWidth: 58 },
                2: { cellWidth: 26, halign: "center" },
                3: { cellWidth: 38, halign: "center" },
                4: { cellWidth: 30, halign: "center" },
            },
            });

            // Dynamic Guest Box Height
            let guestBoxHeight = doc.lastAutoTable.finalY - guestBoxY + 10;

            // Redraw Box Border & Complete Accent Bar
            doc.setDrawColor(...BORDER_LIGHT);
            doc.roundedRect(15, guestBoxY, 180, guestBoxHeight, 4, 4, "S");
            doc.setFillColor(...ACCENT_COLOR);
            doc.rect(15, guestBoxY, 5, guestBoxHeight, "F");

            currentY = guestBoxY + guestBoxHeight + 10;

            // ---------- STAY DETAILS ----------
            checkNewPage(50);

            doc.setFillColor(...LIGHT_GRAY);
            doc.setDrawColor(...BORDER_LIGHT);
            doc.roundedRect(15, currentY, 180, 40, 4, 4, "FD");

            doc.setFillColor(...ACCENT_COLOR);
            doc.rect(15, currentY, 5, 40, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text("STAY DETAILS", 24, currentY + 7);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(90, 90, 90);
            doc.text("Check-in Date", 24, currentY + 16);
            doc.text("Check-out Date", 24, currentY + 26);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            doc.text(
            booking.StartDate ? Formatter.formatDate(booking.StartDate) : "-",
            60,
            currentY + 16,
            );
            doc.text(
            booking.EndDate ? Formatter.formatDate(booking.EndDate) : "-",
            60,
            currentY + 26,
            );

            doc.setFont("helvetica", "bold");
            doc.setTextColor(90, 90, 90);
            doc.text("Room Type", 115, currentY + 16);
            doc.text("No Of Guests", 115, currentY + 26);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            doc.text(booking.BedType || "-", 150, currentY + 16);
            doc.text(String(booking.NoOfPersons || "-"), 150, currentY + 26);

            currentY += 50;

            // ---------- FACILITY DETAILS ----------
            if (facilities.length > 0) {
            // Safeguard check: Move title section ONLY if there isn't even 15mm left on Page 1
            if (currentY + 20 > 280) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(
                PRIMARY_COLOR[0],
                PRIMARY_COLOR[1],
                PRIMARY_COLOR[2],
            );
            doc.text("FACILITY DETAILS", 15, currentY);

            doc.setDrawColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.setLineWidth(0.8);
            doc.line(15, currentY + 3, 70, currentY + 3);

            currentY += 8;

            let tableBody = facilities.map((item, index) => [
                (index + 1).toString(),
                item.FacilityName || "-",
                `${Formatter.formatDate(item.StartDate) || "-"}`,
                `${Formatter.formatDate(item.EndDate) || "-"}`,
                `${Formatter.fromatNumber(parseFloat(item.BasicFacilityPrice) || 0)}`,
                item.UnitText || "-",
                `${Formatter.fromatNumber(parseFloat(item.FacilitiPrice) || 0)}`,
            ]);

            // BUG REMOVED: Deleted the block that manually triggered a hard break if the full table couldn't fit.
            // AutoTable will now split dynamically between Page 1 and Page 2.
            doc.autoTable({
                startY: currentY,
                margin: { left: 15, right: 15 },
                head: [
                [
                    "Sl.No",
                    "Particular",
                    "Start Date",
                    "End Date",
                    "Gross Price",
                    "Unit",
                    "Total",
                ],
                ],
                body: tableBody,
                theme: "striped",
                styles: {
                font: "helvetica",
                fontSize: 9,
                cellPadding: 2,
                lineColor: [220, 220, 220],
                lineWidth: 0.1,
                valign: "middle",
                },
                headStyles: {
                fillColor: PRIMARY_COLOR,
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 10,
                halign: "center",
                },
                columnStyles: {
                0: { cellWidth: 12, halign: "center" },
                1: { cellWidth: "auto", halign: "left" },
                2: { cellWidth: 24, halign: "center" },
                3: { cellWidth: 24, halign: "center" },
                4: { cellWidth: 24, halign: "right" },
                5: { cellWidth: 18, halign: "center" },
                6: { cellWidth: 28, halign: "right" },
                },
            });

            // Always calculate the next baseline from where the table actually ends
            currentY = doc.lastAutoTable.finalY + 12;
            }

            // ========== PAYMENT SUMMARY ==========
            // Check if the payment card (approx 90mm) fits on the page where the table stopped
            if (currentY + 95 > 280) {
            doc.addPage();
            currentY = 20;
            }

            const roomRent = parseFloat(oHostelModel.RoomPrice) || 0;
            const facilityTotal = parseFloat(oHostelModel.TotalFacilityPrice) || 0;
            const subTotal = roomRent + facilityTotal;
            const discount = parseFloat(booking.Discount) || 0;
            const deposit = parseFloat(data.Deposit) || 0;
            let grandTotal = oHostelModel.GrandTotal;

            const summaryHeight = 90;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(245, 186, 66);
            doc.setLineWidth(0.3);
            doc.roundedRect(15, currentY, 180, summaryHeight, 4, 4, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.text("PAYMENT SUMMARY", 20, currentY + 10);

            let summaryY = currentY + 22;
            const leftX = 20;
            const rightX = 185;

            const addLine = (label, value, isGrandTotal = false) => {
            if (isGrandTotal) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(80, 80, 80);
            }

            doc.text(label, leftX, summaryY);
            doc.text(value, rightX, summaryY, { align: "right" });
            summaryY += 7;
            };

            addLine("Room Rent", ` ${Formatter.fromatNumber(roomRent)}`);
            addLine("Facilities", ` ${Formatter.fromatNumber(facilityTotal)}`);
            addLine("Sub Total", ` ${Formatter.fromatNumber(subTotal)}`);

            if (booking.GSTType === "CGST/SGST") {
            const cgst = parseFloat(oHostelModel.CGST) || 0;
            const sgst = parseFloat(oHostelModel.SGST) || 0;
            addLine(
                `CGST (${oHostelModel.GSTValue}%)`,
                ` ${Formatter.fromatNumber(cgst)}`,
            );
            addLine(
                `SGST (${oHostelModel.GSTValue}%)`,
                ` ${Formatter.fromatNumber(sgst)}`,
            );
            }

            if (booking.GSTType === "IGST") {
            const igst = parseFloat(oHostelModel.IGST) || 0;
            addLine(
                `IGST (${oHostelModel.GSTValue}%)`,
                ` ${Formatter.fromatNumber(igst)}`,
            );
            }

            addLine("Discount", `-  ${Formatter.fromatNumber(discount)}`);

            summaryY += 2;
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(leftX, summaryY - 2, rightX, summaryY - 2);

            summaryY += 2;
            addLine("GRAND TOTAL", ` ${Formatter.fromatNumber(grandTotal)}`, true);

            currentY += summaryHeight + 10;

            // ========== AMOUNT IN WORDS ==========
            if (currentY + 25 > 280) {
            doc.addPage();
            currentY = 20;
            }

            doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
            doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
            doc.roundedRect(15, currentY, 180, 20, 4, 4, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.text("Amount in Words:", 20, currentY + 8);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            const words = await this.convertNumberToWords(grandTotal, currency);
            const wrappedWords = doc.splitTextToSize(
            words || "Zero Rupees Only",
            160,
            );
            doc.text(wrappedWords, 20, currentY + 15);

            currentY += 28;

            // ========== IMPORTANT INFORMATION ==========
            if (currentY + 45 > 280) {
            doc.addPage();
            currentY = 20;
            }

            doc.setFillColor(255, 250, 240);
            doc.setDrawColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.roundedRect(15, currentY, 180, 40, 4, 4, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.text("IMPORTANT INFORMATION", 20, currentY + 8);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);

            const infoItems = [
            "• Valid government ID required at check-in (Passport, Driver's License, etc.)",
            "• GST invoice available at the property upon request",
            `• Check-in: ${checkinTime} | Check-out: ${checkoutTime}`,
            "• Early check-in/late check-out subject to availability",
            ];

            let infoY = currentY + 16;
            infoItems.forEach((item) => {
            doc.text(item, 20, infoY);
            infoY += 5;
            });

            currentY += 48;

            // ========== FOOTER ==========
            if (currentY + 15 > 280) {
            doc.addPage();
            currentY = 20;
            }

            doc.setDrawColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.setLineWidth(0.3);
            doc.line(15, currentY, 195, currentY);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(
            "Thank you for choosing us! We look forward to hosting you.",
            15,
            currentY + 5,
            );

            doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.text("Premium Hospitality Experience", 195, currentY + 5, {
            align: "right",
            });

            // ✅ RETURN BASE64 (IMPORTANT CHANGE)
            return doc.output("datauristring").split(",")[1];
        },

        onNavBack: function () {
            const sBranchCode = this.getView().getModel("HostelModel").getProperty("/BranchCode");
            const oRouter = this.getOwnerComponent().getRouter();

            MessageBox.warning(
                "Do you really want to go back? All saved changes will be lost",
                {
                    actions: [MessageBox.Action.CANCEL, MessageBox.Action.OK],
                    emphasizedAction: MessageBox.Action.OK,
                    styleClass: "myUnifiedBtn",
                    onClose: function (sAction) {
                        if (sAction !== MessageBox.Action.OK) {
                            return;
                        }

                        this._resetBookingPageModels();

                        if (sBranchCode) {
                            oRouter.navTo("RouteViewRooms", {
                                sPath: sBranchCode
                            });
                            return;
                        }

                        sessionStorage.setItem("homePageReturnTab", "idRooms");
                        oRouter.navTo("RouteHostel");
                    }.bind(this)
                }
            );
        },

        onContinueBooking: async function () {
            const oModel = this.getView().getModel("HostelModel");
            const sPropertyType = String(oModel.getProperty("/PropertyType") || "").trim();
            const bSupportsCustomerGST = this._supportsCustomerGSTOverride(sPropertyType);
            const bIsBusinessTravel = !!oModel.getProperty("/IsBusinessTravel");
            const sCustomerGSTIN = String(oModel.getProperty("/CustomerGSTIN") || "").trim();
            const sCompanyName = String(oModel.getProperty("/CompanyName") || "").trim();
            const sCompanyAddress = String(oModel.getProperty("/CompanyAddress") || "").trim();
            let oPaymentTypeGroup;

            if (!this._validateBookingBeforePayment()) {
                return;
            }

            oModel.setProperty("/BookingPayload", {
                isB2B: bSupportsCustomerGST && bIsBusinessTravel && !!sCustomerGSTIN,
                customerGSTIN: sCustomerGSTIN,
                companyName: sCompanyName,
                companyAddress: sCompanyAddress,
                propertyGSTIN: oModel.getProperty("/PropertyGSTIN") || "",
                gstType: oModel.getProperty("/EffectiveGSTType") || "",
                gstValue: oModel.getProperty("/EffectiveGSTValue") || 0
            });

            await this._ensurePaymentDialog();
            oPaymentTypeGroup = sap.ui.getCore().byId("idPaymentTypeGroup");

            if (oPaymentTypeGroup) {
                oPaymentTypeGroup.setSelectedIndex(0);
                this.onPaymentTypeSelect({
                    getSource: function () {
                        return oPaymentTypeGroup;
                    }
                });
            } else {
                this._togglePaymentSections(false, false, true);
                this._syncPaymentModel("PayOnCheckIn");
            }

            this._oPaymentDialog.open();
        },

        onPrimaryOccupantRadioSelect: function (oEvent) {
            const oSelectedItem = oEvent.getSource();
            const oBindingContext = oSelectedItem.getBindingContext("BookingView");
            if (!oBindingContext) {
                return;
            }

            const sPath = oBindingContext.getPath();
            const oBookingView = this.getView().getModel("BookingView");
            const aFamilyMembers = oBookingView.getProperty("/FamilyMembers") || [];

            // Update all members: set IsPrimary to false except for the selected one
            const aUpdatedMembers = aFamilyMembers.map(function (oMember, iIndex) {
                const bIsPrimary = sPath.endsWith("" + iIndex);
                return Object.assign({}, oMember, {
                    IsPrimary: bIsPrimary
                });
            });

            oBookingView.setProperty("/FamilyMembers", aUpdatedMembers);

            // Also update MasterMembers to keep them in sync
            const aMasterMembers = oBookingView.getProperty("/MasterMembers") || [];
            const aUpdatedMasterMembers = aMasterMembers.map(function (oMember) {
                const bIsPrimary = oMember.id === aUpdatedMembers.find(m => m.IsPrimary)?.id;
                return Object.assign({}, oMember, {
                    IsPrimary: !!bIsPrimary
                });
            });
            oBookingView.setProperty("/MasterMembers", aUpdatedMasterMembers);
        },

        onGSTINChange: function (oEvent) {
            utils._LCvalidateGstNumber(oEvent)
        },
        onchangeCompanyname: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
        },
        onchangeConpanyAddress: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
        },


    });
});
