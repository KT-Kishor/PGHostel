sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation",
    "../model/formatter",
], function (BaseController, JSONModel, MessageToast, MessageBox, utils, Formatter) {
    "use strict";
    const $C = (id) => sap.ui.getCore().byId(id);
    const $V = (id) => $C(id)?.getValue()?.trim() || "";
    return BaseController.extend("sap.ui.com.project1.controller.Hostel", {
        _isProfileRequested: false,
        Formatter: Formatter,
        onInit: function () {
            this.getView().setModel(new sap.ui.model.json.JSONModel({ showGlobalFooter: false, showRoomsFooter: false, }), "FooterModel");
            this.getOwnerComponent().getRouter().getRoute("RouteHostel").attachMatched(this._onRouteMatched, this);
            this._getBrowserLocation();
            this._initAdminSignupModel();
        },
        _getBrowserLocation: function () {
            if (!navigator.geolocation) {
                sap.m.MessageToast.show(this.i18nModel.getText("geolocationnotsupported"));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    let lat = pos.coords.latitude;
                    let lng = pos.coords.longitude;
                    this._getLocationName(lat, lng);
                },
                (err) => {
                    console.error("Location error:", err);
                }
            );
        },
        _getLocationName: function (lat, lng) {
            let url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

            $.ajax({
                url: url,
                method: "GET",
                success: (data) => {
                    if (!data || !data.address) {
                        return;
                    }

                    let city = data.address.city ||
                        data.address.town ||
                        data.address.village ||
                        data.address.municipality;
                    this.City = city
                },
                error: (err) => {
                    console.error("Reverse geocoding failed", err);
                }
            });
        },

        _onRouteMatched: async function () {


             var oNavContainer = this.byId("pageContainer");
    var oTabHeader = this.byId("mainTabHeader");

    if (oNavContainer) {
        oNavContainer.to(this.byId("idHome"));
    }

    if (oTabHeader) {
        oTabHeader.setSelectedKey("idHome");
    }
            
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.iTop = 4; // records per load
            this.iSkip = 0;   // starting index

            this.flag = false
            this.roomtype = false

            if (!this.getView().getModel("VisibilityModel")) {
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    BedTypes: [],
                    NoData: false,
                    ShowViewMore: false
                }), "VisibilityModel");
            }

            const oView = this.getView();

            //  Disable controls initially
            this.byId("id_Branch").setEnabled(true);
            this.byId("id_Area").setEnabled(true);
            this.byId("id_Roomtype").setEnabled(true);

            //  Create all static local models
            oView.setModel(new sap.ui.model.json.JSONModel({
                CustomerName: "",
                MobileNo: "",
                Gender: "",
                DateOfBirth: "",
                CustomerEmail: "",
                RoomType: ""
            }), "HostelModel");
            oView.setModel(new JSONModel({ isEditMode: false }), "saveModel");
            // oView.setModel(new JSONModel({ isOtpSelected: false, isPasswordSelected: true }), "LoginViewModel");
            oView.setModel(new JSONModel({
                isOtpSelected: false,
                isPasswordSelected: true,
                authFlow: "signin",
                isOtpBoxVisible: false

            }), "LoginViewModel");

            const vm = oView.getModel("LoginViewModel");

            // Add only your required properties (safe, isolated)
            vm.setProperty("/loginMode", "password");   // "password" or "otp"
            vm.setProperty("/showOTPField", false);     // show OTP input box only after Send OTP success
            vm.setProperty("/isOtpEntered", false);     // enable Sign In only when OTP entered

            oView.setModel(new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: ""
            }), "LoginMode");
            oView.setModel(new JSONModel({
                selectedSection: "profile"
            }), "profileSectionModel");

            //  Hardcoded branches (initial fallback)
            const aBranches = [{
                BranchCode: "KLB01",
                BranchName: "Kalaburagi"
            },
            {
                BranchCode: "BR002",
                BranchName: "Mumbai"
            },
            {
                BranchCode: "BR003",
                BranchName: "Nagpur"
            },
            {
                BranchCode: "BR004",
                BranchName: "Nashik"
            }
            ];
            oView.setModel(new JSONModel({
                Branches: aBranches
            }), "BranchModel");
            oView.getModel("LoginViewModel").setProperty("/showOTPField", false);

            const oState = sap.ui.getCore().byId("signUpState");
            const oCity = sap.ui.getCore().byId("signUpCity");

            if (oState?.getBinding("items")) {
                oState.getBinding("items").filter([
                    new sap.ui.model.Filter("stateName", "EQ", "__NONE__")
                ]);
            }

            if (oCity?.getBinding("items")) {
                oCity.getBinding("items").filter([
                    new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
                ]);
            }
            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/otpTimer", 0);
            vm.setProperty("/otpButtonText", "Send OTP");

            const oFooterModel = this.getView().getModel("FooterModel");

            // Default landing tab = Home
            oFooterModel.setProperty("/showGlobalFooter", true);
            oFooterModel.setProperty("/showRoomsFooter", false);

            const oWrapper = this.byId("exploreWrapper");
            if (oWrapper && !this._exploreAnimated) {
                this._exploreAnimated = true;
                this._animateExploreButton();
            }

            const oNav = this.byId("pageContainer");
            oNav.setDefaultTransitionName("None");

        },


        CustomerDetails: async function () {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_Customer", {});
                const aCustomers = Array.isArray(oData.Customers) ? oData.Customers : [oData.Customers];

                const oCustomerModel = new JSONModel(aCustomers);
                this.getView().setModel(oCustomerModel, "CustomerModel");
            } catch (err) {
                console.error("Error while fetching Customer details:", err);
            }
        },

        onUserlivechange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        onReadcallforRoom: async function () {
            try {
                const oView = this.getView();
                const oResponse = await this.ajaxReadWithJQuery("HM_Rooms", {});
                const aRooms = oResponse?.commentData || [];
                const oRoomModel = new JSONModel({ Rooms: aRooms });
                oView.setModel(oRoomModel, "RoomCountModel"); //  Bind model to the view
            } catch (err) {
                console.error("Error reading rooms:", err);
                sap.m.MessageToast.show(this.i18nModel.getText("failedloadroomdata"));
            }
        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = { id_Branch: new Set(), };

            data.forEach(item => {
                uniqueValues.id_Branch.add(item.City);
            });

            let oView = this.getView();
            ["id_Branch"].forEach(field => {
                let oComboBox = oView.byId(field);
                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },

        onSelectPricePlan: function (oEvent) {
            const oTile = oEvent.getSource();
            const sType = oTile.data("type"); // "daily", "monthly", or "yearly"
            const oView = this.getView();
            const oModel = oView.getModel("HostelModel");
            const oData = oModel.getData();
            const sCurrency = oData.Currency || "INR";

            // Map type -> model property
            const mPriceMap = {
                daily: "Price",
                monthly: "MonthPrice",
                yearly: "YearPrice"
            };

            // Map type -> backend label
            const mTypeLabel = {
                daily: "Per Day",
                monthly: "Per Month",
                yearly: "Per Year"
            };

            const sPriceKey = mPriceMap[sType];
            const sPriceValue = sPriceKey ? oData[sPriceKey] : "N/A";

            // Reset then set values
            oModel.setProperty("/SelectedPriceType", "");
            oModel.setProperty("/SelectedPriceValue", "");

            oModel.setProperty("/SelectedPriceType", mTypeLabel[sType] || sType);
            oModel.setProperty("/SelectedPriceValue", sPriceValue);
            oModel.setProperty("/SelectedCurrency", sCurrency);

            // --- VISUAL FEEDBACK SECTION ---
            const oParent = oTile.getParent();
            let aSiblings = [];

            if (oParent.getItems) {
                aSiblings = oParent.getItems();
            } else if (oParent.getContent) {
                aSiblings = oParent.getContent();
            }

            aSiblings.forEach(oItem => {
                if (oItem.removeStyleClass) {
                    oItem.removeStyleClass("selectedTile");
                    oItem.addStyleClass("defaultTile");
                }
            });

            oTile.removeStyleClass("defaultTile");
            oTile.addStyleClass("selectedTile");
        },

        onConfirmBooking: function () {

            const oView = this.getView();
            const oLocalModel = oView.getModel("HostelModel");
            const oData = oLocalModel?.getData?.() || {};

            // -------------------------
            // BASIC VALIDATIONS
            // -------------------------
            if (!oData.Visible) {
                sap.m.MessageToast.show(this.i18nModel.getText("thisroomcurrentlyoccupiedPleaseselectanotherroom"));
                return;
            }

            if (!oData.SelectedPriceType || !oData.SelectedPriceValue) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseselectpricingplanbeforebooking"));
                return;
            }

            // -------------------------
            // GET / CREATE GLOBAL MODEL
            // -------------------------
            let oGlobalModel = sap.ui.getCore().getModel("HostelModel");
            if (!oGlobalModel) {
                oGlobalModel = new sap.ui.model.json.JSONModel({});
                sap.ui.getCore().setModel(oGlobalModel, "HostelModel");
            }

            // -------------------------
            // BUILD BOOKING DATA
            // -------------------------
            const oBookingData = {
                BookingDate: new Date().toISOString(),
                RoomNo: oData.RoomNo || "",
                BedType: oData.BedType || "",
                ACType: oData.ACType || "",
                Capacity: parseInt(oData.Capacity, 10) || 1,
                Address: oData.Address || "",
                Description: oData.Description || "",
                BranchCode: oData.BranchCode || "",
                SelectedPriceType: oData.SelectedPriceType,
                FinalPrice: oData.SelectedPriceValue,
                Currency: oData.Currency || "INR",
                Source: "UI5_HostelApp",
                Status: "Pending",
                Country: oData.Country,
                AvailbleBeds: parseInt(oData.AvailbleBeds, 10) || 0,
                Price: oData.Price,
                MonthPrice: oData.MonthPrice,
                YearPrice: oData.YearPrice
            };

            // -------------------------
            // MERGE WITH GLOBAL MODEL
            // -------------------------
            const oMergedData = {
                ...oGlobalModel.getData(),
                ...oBookingData
            };

            // -------------------------
            // ✅ FIX: NO OF PERSONS BASED ON AVAILABLE BEDS
            // -------------------------
            const iAvailableBeds = parseInt(oMergedData.AvailbleBeds, 10) || 0;

            if (iAvailableBeds <= 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("nobedsavailableforbooking"));
                return;
            }

            const aPersonsList = [];
            for (let i = 1; i <= iAvailableBeds; i++) {
                aPersonsList.push({
                    key: i.toString(),
                    text: i.toString()
                });
            }

            oMergedData.NoOfPersonsList = aPersonsList;

            // Optional: auto-select max available persons
            oMergedData.SelectedPerson = aPersonsList[aPersonsList.length - 1].key;

            // -------------------------
            // UPDATE GLOBAL MODEL
            // -------------------------
            oGlobalModel.setData(oMergedData, true);

            // -------------------------
            // CLOSE ROOM DETAIL DIALOG
            // -------------------------
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close();
            }

            this._clearRoomDetailDialog();

            // -------------------------
            // NAVIGATE TO BOOKING PAGE
            // -------------------------
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBookRoom");
        },

        _clearRoomDetailDialog: function () {
            if (!this._oRoomDetailFragment) return;

            const oFrag = this._oRoomDetailFragment;

            // Reset price tile classes
            oFrag.findAggregatedObjects(true, obj => obj.hasStyleClass && obj.hasStyleClass("priceItem"))
                .forEach(item => {
                    item.removeStyleClass("selectedTile");
                    item.addStyleClass("defaultTile");
                });

            // Destroy carousel pages
            const oCarousel = oFrag.findAggregatedObjects(true, obj => obj.isA && obj.isA("sap.m.Carousel"))[0];
            if (oCarousel) oCarousel.destroyPages();

            // Destroy integration card
            const oCard = oFrag.findAggregatedObjects(true, obj => obj.isA && obj.isA("sap.ui.integration.widgets.Card"))[0];
            if (oCard) oCard.destroy();

            // Destroy fragment models
            ["HostelModel", "FacilityModel"].forEach(name => {
                const m = oFrag.getModel(name);
                if (m) m.destroy();
            });

            // Remove the fragment entirely
            this.getView().removeDependent(oFrag);
            oFrag.destroy();
            this._oRoomDetailFragment = null;

            if (this._carouselInterval) {
                clearInterval(this._carouselInterval);
                this._carouselInterval = null;
            }
        },

        _bindCarousel: function () {

            const oCarousel =
                this._oRoomDetailFragment
                    .findAggregatedObjects(true,
                        obj => obj.isA && obj.isA("sap.m.Carousel")
                    )[0];

            if (!oCarousel) return;

            // ---------- bind carousel images ----------
            oCarousel.unbindAggregation("pages");

            oCarousel.bindAggregation("pages", {
                path: "HostelModel>/ImageList",
                template: new sap.m.Image({
                    src: "{HostelModel>}",
                    width: "100%",
                    densityAware: false,
                    decorative: false,
                    error: this.onImageLoadError.bind(this)
                })
            });

            // ---------- AUTO SCROLL ----------
            const START_AUTOSCROLL = () => {

                const imgs =
                    this._oRoomDetailFragment
                        ?.getModel("HostelModel")
                        ?.getProperty("/ImageList") || [];

                if (imgs.length <= 1) return;

                this._carouselInterval = setInterval(() => {

                    if (oCarousel && oCarousel.getPages().length > 1) {
                        oCarousel.next();
                    }

                }, 3000);
            };

            // kill old autoplay timer
            if (this._carouselInterval) {
                clearInterval(this._carouselInterval);
                this._carouselInterval = null;
            }

            START_AUTOSCROLL();

            // ---------- PAUSE HANDLING ----------
            const PAUSE_FOR_10_SECONDS = () => {

                // stop current autoplay
                if (this._carouselInterval) {
                    clearInterval(this._carouselInterval);
                    this._carouselInterval = null;
                }

                // stop any existing "resume" timer
                if (this._carouselResumeTimeout) {
                    clearTimeout(this._carouselResumeTimeout);
                }

                // resume after 10s
                this._carouselResumeTimeout = setTimeout(() => {
                    START_AUTOSCROLL();
                }, 10000);
            };

            // ---------- USER INTERACTION EVENTS ----------
            oCarousel.attachBrowserEvent("touchstart", PAUSE_FOR_10_SECONDS);
            oCarousel.attachBrowserEvent("mousedown", PAUSE_FOR_10_SECONDS);
            oCarousel.attachBrowserEvent("click", PAUSE_FOR_10_SECONDS);
        },



        _LoadFacilities: function (sBranchCode) {
            const oView = this.getView();
            if (!this._oRoomDetailFragment) return; // Safety check

            if (!sBranchCode) return;

            // 💡 FIX: Get the model from the view, not the fragment, to ensure it's always found.
            const oFacilityModel = this.getView().getModel("FacilityModel");
            if (!oFacilityModel) return;
            oFacilityModel.setProperty("/loading", true);
            this.ajaxReadWithJQuery("HM_Facilities", {
                BranchCode: sBranchCode
            })
                .then((Response) => {
                    const aFacilities = (Response && Response.data) ? Response.data : [];

                    const convert = (base64, type) => {
                        if (!base64) {
                            return sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png");
                        }
                        return `data:${type || "image/jpeg"};base64,${base64}`;
                    };

                    const formatted = aFacilities
                        .map(f => {
                            let price = 0;
                            let unit = "";

                            if (parseFloat(f.PerHourPrice) > 0) {
                                price = f.PerHourPrice;
                                unit = "Per Hour";
                            }
                            else if (parseFloat(f.PerDayPrice) > 0) {
                                price = f.PerDayPrice;
                                unit = "Per Day";
                            }
                            else if (parseFloat(f.PerMonthPrice) > 0) {
                                price = f.PerMonthPrice;
                                unit = "Per Month";
                            }
                            else if (parseFloat(f.PerYearPrice) > 0) {
                                price = f.PerYearPrice;
                                unit = "Per Year";
                            }
                            else {
                                return null; // ❌ NO prices at all → drop facility
                            }

                            return {
                                FacilityID: f.ID,
                                FacilityName: f.FacilityName,
                                Image: convert(f.Photo1, f.Photo1Type),
                                Price: price,
                                UnitText: unit,
                                Currency: f.Currency
                            };
                        })
                        .filter(Boolean);   // removes null entries (facilities with all prices = 0)


                    oFacilityModel.setProperty("/Facilities", formatted);
                    oFacilityModel.setProperty("/loading", false);

                    oFacilityModel.refresh(true);
                })
                .catch(err => {
                    console.error("Failed to load facilities:", err);
                    oFacilityModel.setProperty("/loading", false);
                });
        },


        viewDetails: function (oEvent) {
            try {
                const oView = this.getView();
                const oSelected = oEvent.getSource().getBindingContext("VisibilityModel").getObject();
                const oFullDetails = {
                    RoomNo: oSelected.RoomNo || "",
                    BedType: oSelected.Name || "",
                    ACType: oSelected.ACType || "AC",
                    Description: oSelected.Description || "No description available",
                    Price: oSelected.Price || "N/A",
                    MonthPrice: oSelected.MonthPrice || "N/A",
                    YearPrice: oSelected.YearPrice || "N/A",
                    Currency: oSelected.Currency || "INR",
                    Address: oSelected.Address || "",
                    BranchCode: oSelected.BranchCode || "",
                    Capacity: oSelected.NoOfPerson || "",
                    ImageList: (oSelected.Images || []).map(img => img.src),
                    SelectedPriceType: "",
                    SelectedPriceValue: "",
                    Country: oSelected.Country,
                    Visible: oSelected.Visible,
                    AvailbleBeds: oSelected.AvailbleBeds
                };

                const oHostelModel = new sap.ui.model.json.JSONModel(oFullDetails);
                oView.setModel(oHostelModel, "HostelModel");

                oView.setModel(new sap.ui.model.json.JSONModel({
                    loading: true,
                    Facilities: []
                }), "FacilityModel");

                // Load / reuse fragment
                if (!this._oRoomDetailFragment) {
                    sap.ui.core.Fragment.load({
                        id: "roomDetailsFrag",
                        name: "sap.ui.com.project1.fragment.viewRoomDetails",
                        controller: this
                    }).then(fragment => {

                        this._oRoomDetailFragment = fragment;
                        this.getView().addDependent(fragment);

                        // ✅ Attach models
                        fragment.setModel(oHostelModel, "HostelModel");
                        fragment.setModel(oView.getModel("FacilityModel"), "FacilityModel");

                        // ✅ THIS WAS THE MISSING LINE
                        const bPhone = sap.ui.Device.system.phone;
                        fragment.setContentWidth(bPhone ? "100%" : "70%");

                        // ✅ Open dialog AFTER models are set
                        fragment.open();

                        this._bindCarousel();
                        this._LoadFacilities(oSelected.BranchCode);
                        this._updateBookTileState();

                    });


                    return; // stop here because first-time load is async via .then()
                }

                // Fragment already exists (2nd, 3rd, nth time)

                this._oRoomDetailFragment.setModel(oHostelModel, "HostelModel");
                this._oRoomDetailFragment.setModel(oView.getModel("FacilityModel"), "FacilityModel");

                // Open instantly
                this._oRoomDetailFragment.open();

                // Bind carousel
                this._bindCarousel();

                // Load facilities asynchronously
                this._LoadFacilities(oSelected.BranchCode);
                this._updateBookTileState();

            } catch (err) {
                console.error(" viewDetails error:", err);
            }
        },
        _updateBookTileState: function () {

            const oTile =
                sap.ui.core.Fragment.byId("roomDetailsFrag", "bookTile");

            if (!oTile) return;

            const bOccupied =
                !this.getView().getModel("HostelModel").getProperty("/Visible");

            if (bOccupied) {
                oTile.addStyleClass("occupied");
            } else {
                oTile.removeStyleClass("occupied");
            }
        },


        _LoadAmenities: async function (sBranchCode) {
            const oAmenityModel = new sap.ui.model.json.JSONModel({
                loading: true,
                Amenities: []
            });

            this._oRoomDetailFragment.setModel(oAmenityModel, "AmenityModel");

            try {
                // 1️⃣ Fetch ALL once (don’t rely on server filter)
                let resp = await this.ajaxReadWithJQuery("HM_HostelFeatures", {});
                let allList = resp?.data || [];

                // 2️⃣ Filter branch only (strict match)
                const branchList = allList.filter(x => (x.BranchCode || "").trim() === (sBranchCode || "").trim());

                if (branchList.length > 0) {

                    oAmenityModel.setProperty("/Amenities", this._convertAmenities(branchList));
                    // } else {
                    //     // 🔄 Branch not found → show ONLY blank fallback
                    //     const fallbackList = allList.filter(x => (x.BranchCode || "").trim() === "");
                    //     console.warn("↩️ Showing fallback amenities:", fallbackList);
                    //     oAmenityModel.setProperty("/Amenities", this._convertAmenities(fallbackList));
                    // }
                } else {
                    console.warn("🚫 No amenities found for this branch:", sBranchCode);
                    oAmenityModel.setProperty("/Amenities", []); // show nothing
                }

            } catch (err) {
                console.error("❌ Amenity load error:", err);
            }
            oAmenityModel.setProperty("/loading", false);
        },

        _convertAmenities: function (list) {
            return list.map(item => ({
                ...item,
                ImageSrc: item.Photo1 ?
                    `data:${item.Photo1Type || "image/jpeg"};base64,${item.Photo1}` : ""
            }));
        },

        onRoomDetailOpened: function () {
            // Get the branch code from the dialog's model
            if (this._oRoomDetailFragment) {
                const oModel = this._oRoomDetailFragment.getModel("HostelModel");
                if (oModel) {
                    const sBranchCode = oModel.getProperty("/BranchCode");
                    this._LoadAmenities(sBranchCode);
                }
            }
        },

        onImageLoadError: function (oEvent) {
            const oImage = oEvent.getSource();
            const sFallback = sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png");

            if (!oImage.data("hasFallback")) {
                oImage.data("hasFallback", true);
                setTimeout(() => oImage.setSrc(sFallback), 0); // Agar image load nahi hui, toh fallback set hoga
            } else {
                console.warn("⚠️ Final fallback image also failed to load:", sFallback);
            }
        },

        onCloseRoomDetail: function () {
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close(); // close FIRST
            }

            this._clearRoomDetailDialog(); // destroy AFTER
        },

        onDialogAfterClose: function () {
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close(); // close FIRST
            }

            this._clearRoomDetailDialog();
        },

        // onTabSelect: async function (oEvent) {
        //     var oItem = oEvent.getParameter("item");
        //     const sKey = oItem.getKey();

        //     this.byId("pageContainer").to(this.byId(sKey));

        //     var page = this.byId(sKey);
        //     if (page && page.scrollTo) page.scrollTo(0, 0);
        //     this.flag = true
        //     this.iTop = 4;
        //     this.iSkip = 0;
        //     this.roomtype = true

        //     if (sKey === "idRooms") {
        //         await this._loadRoomsPageData();
        //     }


        // },

        // onTabSelect: async function (oEvent) {
        //     var oItem = oEvent.getParameter("item");
        //     const sKey = oItem.getKey();

        //     this.byId("pageContainer").to(this.byId(sKey));

        //     var page = this.byId(sKey);
        //     if (page && page.scrollTo) page.scrollTo(0, 0);

        //     this.flag = true;
        //     this.iTop = 4;
        //     this.iSkip = 0;
        //     this.roomtype = true;

        //     // 🔑 Footer control (added, not disturbing existing flow)
        //     const oFooterModel = this.getView().getModel("FooterModel");

        //     if (sKey === "idRooms") {
        //         // entering Rooms
        //         oFooterModel.setProperty("/showGlobalFooter", false);
        //         oFooterModel.setProperty("/showRoomsFooter", false);

        //         // keep original behavior
        //         await this._loadRoomsPageData();

        //     } else {
        //         // Home / Contact
        //         oFooterModel.setProperty("/showGlobalFooter", true);
        //         oFooterModel.setProperty("/showRoomsFooter", false);
        //     }
        //     const oNav = this.byId("pageContainer");
        // oNav.setDefaultTransitionName("Slide");

        // const sKeys = oEvent.getParameter("item").getKey();
        // oNav.to(this.byId(sKeys));
        // },
        onTabSelect: async function (oEvent) {
            const sKey = oEvent.getParameter("item").getKey();
            const oNav = this.byId("pageContainer");

            /* 1️⃣ Set transition BEFORE navigation */
            oNav.setDefaultTransitionName("Slide");

            /* 2️⃣ Navigate ONCE */
            oNav.to(this.byId(sKey));

            /* 3️⃣ Reset scroll (safe) */
            const page = this.byId(sKey);
            if (page && page.scrollTo) {
                page.scrollTo(0, 0);
            }

            /* 4️⃣ State flags (unchanged) */
            this.flag = true;
            this.iTop = 4;
            this.iSkip = 0;
            this.roomtype = true;

            /* 5️⃣ Footer control */
            const oFooterModel = this.getView().getModel("FooterModel");

            if (sKey === "idRooms") {
                // Entering Rooms
                oFooterModel.setProperty("/showGlobalFooter", false);
                oFooterModel.setProperty("/showRoomsFooter", false);

                await this._loadRoomsPageData();
            } else {
                // Home / Contact
                oFooterModel.setProperty("/showGlobalFooter", true);
                oFooterModel.setProperty("/showRoomsFooter", false);
            }

            /* 6️⃣ Animate Explore button ONLY on Home */
            if (sKey === "idHome") {
                this._animateExploreButton();
            }
        },

        _animateExploreButton: function () {
            const oWrapper = this.byId("exploreWrapper");
            if (!oWrapper) return;

            // restart animation cleanly
            oWrapper.removeStyleClass("explore-enter");

            // force reflow so animation restarts
            oWrapper.getDomRef()?.offsetHeight;

            oWrapper.addStyleClass("explore-enter");

            // cleanup after animation ends
            setTimeout(() => {
                oWrapper.removeStyleClass("explore-enter");
            }, 1900);
        },

        Branch: async function () {
            const oComponent = this.getOwnerComponent();
            let oBRModel = oComponent.getModel("sBRModel");

            if (!oBRModel) {
                await oComponent._fetchCommonData("HM_Branch", "sBRModel");
                oBRModel = oComponent.getModel("sBRModel");
            }

            const aData = oBRModel?.getData();
            return Array.isArray(aData) ? aData : [];
        },

        onViewMoreRooms: async function () {
            // Load next page
            this.flag = false
            this.roomtype = false
            this.iSkip;
            this.iTop
            const oContainer = this.byId("idViewMoreBusy")
            oContainer.setBusy(true)
            await this._loadFilteredData(this.Scity, this.sBranchCode, this.sACType);
            oContainer.setBusy(false);


            // Set flag to true if needed

            // iTop stays the same (number of items per page)
            // iSkip is automatically incremented in _dRoomsPageData
            // So you don't need to manually change them here
        },

        _loadRoomsPageData: async function () {
            this.iTop = 4;
            this.iSkip = 0;

            this.roomtype = false

            const oContainer = this.byId("idBedTypeFlex");
            const oBranch = this.byId("id_Branch");
            const oArea = this.byId("id_Area");
            const oRoomType = this.byId("id_Roomtype");

            oContainer.setBusy(true);
            oBranch.setBusy(true);
            oArea.setBusy(true);
            oRoomType.setBusy(true);
            const oFooterModel = this.getView().getModel("FooterModel");

            oFooterModel.setProperty("/showRoomsFooter", false);
            try {
                // await this.onReadcallforRoom();
                // await this.CustomerDetails();
                const oModelData = await this.Branch();
                this._populateUniqueFilterValues(oModelData)

                const sCity = this.City ? this.City : oModelData[0].City;

                const aFiltered = oModelData.filter(
                    item => item.City === sCity
                );

                if (aFiltered.length === 0 || sCity) {
                    await this._loadFilteredData(sCity, "", "");
                } else {
                    await this._loadFilteredData(this.City, "", "");
                }

                this.getView().setModel(new JSONModel(aFiltered), "AreaModel");

                // Default selections
                this.byId("id_Branch").setSelectedKey(sCity);
                this.byId("id_Area").setEnabled(true).setSelectedKey("");
                if (this.roomtype !== true) {
                    this.byId("id_Roomtype").setEnabled(true).setSelectedKey("All");
                }

            } catch (error) {
                console.error("Error loading Rooms:", error);
            } finally {
                oContainer.setBusy(false);
                oBranch.setBusy(false);
                oArea.setBusy(false);
                oRoomType.setBusy(false);
                // ✅ show ROOMS footer after success OR failure
                oFooterModel.setProperty("/showRoomsFooter", true);
            }
        },

        onpressFilter: function () {
            var oView = this.getView();
            if (!this.ARD_Dialog) {

                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Filter_Branch", this);
                oView.addDependent(this.ARD_Dialog);
            }
            this._clearFilterFields()
            var oBedTypeCombo = this.byId("id_Area");
            this.byId("id_Roomtype").setSelectedKey("");

            this.byId("id_Branch").setSelectedKey("");

            oBedTypeCombo.setSelectedKey("").setVisible(false);
            this.ARD_Dialog.open();
        },

        // onpressBookrooms: async function () {
        //     var oTabHeader = this.byId("mainTabHeader");
        //     oTabHeader.setSelectedKey("idRooms");
        //     this.byId("pageContainer").to(this.byId("idRooms"));

        //     var page = this.byId("idRooms");
        //     if (page && page.scrollTo) {
        //         page.scrollTo(0, 0);
        //     }

        //     await this._loadRoomsPageData();
        // },

        onpressBookrooms: function () {
            const oTabHeader = this.byId("mainTabHeader");
            const oItem = oTabHeader.getItems().find(i => i.getKey() === "idRooms");

            oTabHeader.setSelectedKey("idRooms");
            this.onTabSelect({ getParameter: () => oItem });
        },

        onpressLogin: function () {

            if (!this._oSignDialog) {
                this._oSignDialog = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.SignInSignup",
                    this
                );
                this.getView().addDependent(this._oSignDialog);
                this._oSignDialog.addStyleClass("authDialog"); // Add our custom style class
                this._oSignDialog.attachAfterClose(this._resetAuthDialog, this);
            }

            const vm = this.getView().getModel("LoginViewModel");

            // COMPLETE reset of all auth-related states
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/loginMode", "password");
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            // 🔥 FIX: You forgot these
            vm.setProperty("/isOtpSelected", false);
            vm.setProperty("/isPasswordSelected", true);

            // Reset fields
            this._resetAllAuthFields?.();
            this._clearAllAuthFields?.();

            // Reset OTP UI
            const otpCtrl = sap.ui.getCore().byId("signInOTP");
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }

            const btnSendOTP = sap.ui.getCore().byId("btnSignInSendOTP");
            if (btnSendOTP) btnSendOTP.setVisible(false);

            // Reset password valid state
            const passCtrl = sap.ui.getCore().byId("signinPassword");
            if (passCtrl) {
                passCtrl.setEnabled(true);
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }

            // Reset dialog title
            vm.setProperty("/dialogTitle", "Hostel Access Portal");

            this.getView().addStyleClass("blur-background");

            this._oSignDialog.open();
        },

        onDialogClose: function () {
            // The afterClose event will handle removing the blur class
            this._resetOtpState();

            if (this._oSignDialog) this._oSignDialog.close();
            if (this._oSignDialog) {
                this.getView().removeStyleClass("blur-background");
                this._oSignDialog.close();
            }
        },

        onSwitchToSignIn: function () {

            const vm = this.getView().getModel("LoginViewModel");

            // -------------------------
            // FLOW RESET
            // -------------------------
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/loginMode", "password");
            vm.setProperty("/forgotStep", 0);
            vm.setProperty("/dialogTitle", "Hostel Access Portal");

            // -------------------------
            // RESET OTP + TIMER
            // -------------------------
            this._resetOtpState();

            // -------------------------
            // RESET SIGN-IN FIELDS
            // -------------------------
            ["signInuserid", "signInusername", "signinPassword", "signInOTP"]
                .forEach(id => {
                    const c = sap.ui.getCore().byId(id);
                    if (c) {
                        c.setValue("");
                        c.setValueState("None");
                        c.setValueStateText("");
                    }
                });

            sap.ui.getCore().byId("signinPassword")?.setEnabled(true);
            sap.ui.getCore().byId("signInOTP")?.setEnabled(false);
            sap.ui.getCore().byId("btnSignInSendOTP")?.setVisible(false);

            // -------------------------
            // RESET FORGOT FIELDS
            // -------------------------
            ["fpUserId", "fpUserName", "fpOTP", "newPass", "confPass"]
                .forEach(id => {
                    const c = sap.ui.getCore().byId(id);
                    if (c) {
                        c.setValue("");
                        c.setValueState("None");
                        c.setValueStateText("");
                    }
                });

            // -------------------------
            // 🚫 DISABLE FORGOT FORM
            // -------------------------
            ["fpUserId", "fpUserName", "fpOTP", "newPass", "confPass"]
                .forEach(id => {
                    const c = sap.ui.getCore().byId(id);
                    if (c) c.setEnabled(false);
                });

            // -------------------------
            // PANELS
            // -------------------------
            sap.ui.getCore().byId("signInPanel")?.setVisible(true);
            sap.ui.getCore().byId("signUpPanel")?.setVisible(false);

            // -------------------------
            // HEADER
            // -------------------------
            sap.ui.getCore().byId("authDialog")
                ?.getCustomHeader()
                ?.getContentMiddle()[0]
                ?.setText("Hostel Access Portal");
        },

        onSwitchToSignUp: function () {
            const vm = this.getView().getModel("LoginViewModel");

            const oSignInPanel = sap.ui.getCore().byId("signInPanel");
            const oSignUpPanel = sap.ui.getCore().byId("signUpPanel");

            // 🔒 MAKE DOB READ-ONLY (calendar-only)
            this._FragmentDatePickersReadOnly(["signUpDOB"]);

            oSignInPanel?.setVisible(false);
            oSignUpPanel?.setVisible(true);

            vm.setProperty("/authFlow", "signup");
            vm.setProperty("/dialogTitle", "Hostel Access Portal");
            // Set min and max dates for the Date of Birth picker
            const oDOBpicker = sap.ui.getCore().byId("signUpDOB");
            if (oDOBpicker) {
                const oToday = new Date();

                // Max date: 10 years ago from today
                const oMaxDate = new Date(oToday.getFullYear() - 10, oToday.getMonth(), oToday.getDate());
                oDOBpicker.setMaxDate(oMaxDate);

                // Min date: 100 years ago from today
                const oMinDate = new Date(oToday.getFullYear() - 100, oToday.getMonth(), oToday.getDate());
                oDOBpicker.setMinDate(oMinDate);
            }
            this._resetOtpState();
            this._addPasswordGenerateIcon();
        },

        SM_onGeneratePassword: function () {

            var oPwdInput = sap.ui.getCore().byId("signUpPassword");
            var oStrength = sap.ui.getCore().byId("passwordStrengthText"); // signup label

            if (!oPwdInput) {
                console.error("❌ signUpPassword input not found");
                return;
            }

            var pwd = utils._LCgenerateStrongPassword();
            oPwdInput.setValue(pwd);

            // Run same validation logic + update strength label
            utils._LCvalidatePassword(oPwdInput, oStrength);
        },


        _addPasswordGenerateIcon: function () {

            const aInputs = [
                sap.ui.getCore().byId("signUpPassword"),
                sap.ui.getCore().byId("newPass")
            ];

            aInputs.forEach((oInput) => {

                if (!oInput || oInput._hasCopyIcon) return;

                oInput.addEndIcon({
                    src: "sap-icon://copy",
                    tooltip: "Copy password",
                    press: this.SM_onCopyPassword.bind(this)
                });

                oInput._hasCopyIcon = true;
            });
        },


        SM_onCopyPassword: function (oEvent) {

            const oIcon = oEvent.getSource();
            const oInput = oIcon.getParent();  // 👈 actual input owning the icon

            if (!oInput || !oInput.getValue) return;

            const pwd = oInput.getValue();

            if (!pwd) {
                sap.m.MessageToast.show(this.i18nModel.getText("noPasswordCopy"));
                return;
            }

            navigator.clipboard.writeText(pwd)
                .then(() => {
                    sap.m.MessageToast.show(this.i18nModel.getText("passwordCopied"));
                })
                .catch(() => {

                    try {
                        const oTemp = document.createElement("textarea");
                        oTemp.value = pwd;
                        document.body.appendChild(oTemp);
                        oTemp.select();
                        document.execCommand("copy");
                        document.body.removeChild(oTemp);

                        sap.m.MessageToast.show(this.i18nModel.getText("passwordCopied"));

                    } catch (err) {
                        sap.m.MessageToast.show(this.i18nModel.getText("copyFailed"));
                    }
                });
        },

        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        // SM_onTogglePasswordVisibility: function (oEvent) {
        //     const oInput = oEvent.getSource();
        //     const isPassword = oInput.getType() === "Password";

        //     oInput.setType(isPassword ? "Text" : "Password");
        //     oInput.setValueHelpIconSrc(isPassword ? "sap-icon://hide" : "sap-icon://show");
        // },

        SM_onTogglePasswordVisibility: function (oEvent) {
            var oInput = oEvent.getSource();

            // 1. Capture value BEFORE type change
            var sValue = oInput.getValue();

            // 2. Toggle type
            var bIsPassword = oInput.getType() === "Password";
            oInput.setType(bIsPassword ? "Text" : "Password");

            // 3. Toggle icon
            oInput.setValueHelpIconSrc(
                bIsPassword ? "sap-icon://hide" : "sap-icon://show"
            );

            // 4. Restore value AFTER re-render
            oInput.setValue(sValue);
        },

        SM_onChnageSetAndConfirm: function (oEvent) {

            const oInput = oEvent.getSource();
            const sId = oInput.getId();
            let oStrengthText = null;

            if (sId === "signUpPassword") {
                oStrengthText = sap.ui.getCore().byId("passwordStrengthText");
            }
            else if (sId === "newPass") {
                oStrengthText = sap.ui.getCore().byId("fpPasswordStrengthText");
            }

            utils._LCvalidatePassword(oInput, oStrengthText);
        },

        SM_onGenerateForgotPassword: function () {

            var oPwdInput = sap.ui.getCore().byId("newPass");
            var oStrength = sap.ui.getCore().byId("fpPasswordStrengthText");

            if (!oPwdInput) {
                console.error("❌ newPass input not found");
                return;
            }

            // ✅ Only generate + validate (NO copying here)
            var pwd = utils._LCgenerateStrongPassword();
            oPwdInput.setValue(pwd);
            utils._LCvalidatePassword(oPwdInput, oStrength);
        },



        onSignUp: async function () {

            const C = sap.ui.getCore().byId.bind(sap.ui.getCore());
            const oModel = this.getView().getModel("LoginMode");
            const data = oModel.getData();

            const std = (C("signUpSTD").getValue() || "").trim();

            // ---- VALIDATION GATE ----
            const isValid = (
                utils._LCstrictValidationSelect(C("signUpSalutation")) &&
                utils._LCvalidateName(C("signUpName"), "ID") &&
                this.onChangeDOB(C("signUpDOB")) &&
                utils._LCstrictValidationSelect(C("signUpGender")) &&
                utils._LCvalidateEmail(C("signUpEmail"), "ID") &&
                utils._LCvalidateMandatoryField(C("signUpCountry"), "ID") &&
                utils._LCvalidateMandatoryField(C("signUpState"), "ID") &&
                utils._LCvalidateMandatoryField(C("signUpCity"), "ID") &&
                utils._LCvalidateMandatoryField(C("signUpSTD"), "ID") &&
                utils._LCvalidateISDmobile(C("signUpPhone"), std) &&
                utils._LCvalidateAddress(C("signUpAddress")) &&
                utils._LCvalidatePassword(
                    C("signUpPassword"),
                    sap.ui.getCore().byId("passwordStrengthText")
                ) &&

                this.FSM_onConfirm({ getSource: () => C("signUpConfirmPassword") })
            );

            if (!isValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("MSfillallfields"));
                return;
            }

            // ---- PAYLOAD BUILD ----

            // Server timestamp in required format
            const TimeDate = new Date().toISOString().replace("T", " ").slice(0, 19);


            const payload = {
                data: {
                    Salutation: C("signUpSalutation").getSelectedKey(),
                    UserName: data.fullname.trim(),
                    Role: "Customer",
                    Type: "Customer",

                    EmailID: data.Email.trim(),
                    Password: btoa(data.password),

                    STDCode: data.STDCode || std,
                    MobileNo: data.Mobileno,

                    Status: "Active",
                    TimeDate,
                    DateOfBirth: data.DateOfBirth || "",
                    Gender: C("signUpGender").getSelectedKey(),

                    Country: data.Country,
                    State: data.State,
                    City: data.City,
                    Address: data.Address.trim()
                }
            };


            sap.ui.core.BusyIndicator.show(0);
            try {
                const oResp = await this.ajaxCreateWithJQuery("HM_Login", payload);

                if (!oResp || oResp.success !== true) {
                    sap.m.MessageToast.show(this.i18nModel.getText("registrationFailedPleasetryagain"));
                    console.error("SignUp Error Response:", oResp);
                    return;
                }
                const sUsername = data.fullname.trim();

                const sPassword = data.password;
                const oCtrl = this;   // 👈 REQUIRED

                sap.m.MessageBox.success("Registration Successful", {
                    title: "Success",
                    onClose: () => {

                        // ✅ Credentials trigger FIRST
                        oCtrl._triggerBrowserSaveCredentials(
                            sUsername,
                            sPassword
                        );

                        // ✅ ALWAYS use oCtrl – never this
                        const vm = oCtrl.getView().getModel("LoginViewModel");

                        vm.setProperty("/authFlow", "signin");
                        vm.setProperty("/loginMode", "password");
                        vm.setProperty("/showOTPField", false);
                        vm.setProperty("/isOtpEntered", false);
                        vm.setProperty("/dialogTitle", "Hostel Access Portal");
                        vm.setProperty("/forgotStep", 1);

                        oCtrl._resetAllAuthFields?.();
                        oCtrl._clearAllAuthFields?.();

                        oModel.setData({
                            fullname: "",
                            Email: "",
                            Mobileno: "",
                            password: "",
                            comfirmpass: "",
                            STDCode: "",
                            Address: "",
                            Country: "",
                            State: "",
                            City: "",
                            Gender: "",
                            DateOfBirth: ""
                        });

                        sap.ui.getCore().byId("signInPanel")?.setVisible(true);
                        sap.ui.getCore().byId("signUpPanel")?.setVisible(false);

                        sap.ui.getCore().byId("signinPassword")?.setEnabled(true).setValue("");
                        sap.ui.getCore().byId("signInOTP")?.setEnabled(false).setValue("");
                        sap.ui.getCore().byId("btnSignInSendOTP")?.setVisible(false);
                        sap.ui.getCore().byId("signInuserid")?.setValue("");
                        sap.ui.getCore().byId("signInusername")?.setValue("");

                        oCtrl._oSignDialog?.close();

                        setTimeout(() => {
                            oCtrl._oSignDialog?.open();
                        }, 200);
                    }
                });


            } catch (err) {

                let sMsg = "Registration failed! Please try again.";

                // ---- Extract backend error message safely ----
                if (err?.responseJSON?.message) {
                    sMsg = err.responseJSON.message;
                }
                else if (typeof err?.responseText === "string") {
                    try {
                        const oErr = JSON.parse(err.responseText);
                        if (oErr?.message) {
                            sMsg = oErr.message;
                        }
                    } catch (e) {
                        // ignore JSON parse errors
                    }
                }

                sap.m.MessageBox.error(sMsg, {
                    title: "Registration Failed"
                });

                console.error("SignUp Error:", err);

            } finally {
                sap.ui.core.BusyIndicator.hide();
            }

        },


        _triggerBrowserSaveCredentials: function (username, password) {

            const form = document.createElement("form");
            form.method = "POST";
            form.action = window.location.href;

            // Off-screen, not hidden
            form.style.position = "absolute";
            form.style.top = "-2000px";
            form.style.opacity = "0.01";

            const u = document.createElement("input");
            u.type = "text";
            u.name = "username";
            u.autocomplete = "username";
            u.value = username;

            const p = document.createElement("input");
            p.type = "password";
            p.name = "password";
            p.autocomplete = "new-password";
            p.value = password;

            form.append(u, p);
            document.body.appendChild(form);

            form.submit();

            setTimeout(() => form.remove(), 300);
        },

        onChangeState: function (oEvent) {

            const oState = oEvent.getSource();
            const oModel = this.getView().getModel("LoginMode");

            // sanitize free typing
            oState.setValue(oState.getValue().replace(/[^a-zA-Z\s]/g, ""));

            utils._LCvalidateMandatoryField(oEvent);

            // ✅ ALWAYS WRITE TO MODEL
            const sStateText =
                oState.getSelectedItem()?.getText() ||
                oState.getValue() ||
                "";

            oModel.setProperty("/State", sStateText);

            // reset city whenever state changes
            const oCity = sap.ui.getCore().byId("signUpCity");
            oModel.setProperty("/City", "");
            oCity.setValue("").setSelectedKey("");

            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);

            // release cities only if country is valid
            const oCountry = sap.ui.getCore().byId("signUpCountry");
            const sCountryCode =
                oCountry.getSelectedItem()?.getAdditionalText()?.trim();

            if (!sCountryCode || !sStateText) return;

            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", sStateText),
                new sap.ui.model.Filter("countryCode", "EQ", sCountryCode)
            ]);
        },
        onChangeCity: function (oEvent) {

            const oCity = oEvent.getSource();
            const oModel = this.getView().getModel("LoginMode");

            // sanitize manual typing
            oCity.setValue(oCity.getValue().replace(/[^a-zA-Z\s]/g, ""));

            const oCountry = sap.ui.getCore().byId("signUpCountry");
            const oState = sap.ui.getCore().byId("signUpState");

            const hasCountry = !!oCountry.getSelectedItem();
            const hasState = !!oState.getSelectedItem() || !!oState.getValue();

            // parent missing → block
            if (!hasCountry || !hasState) {

                oCity.setValue("");
                oCity.setSelectedKey("");

                oCity.getBinding("items")?.filter([
                    new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
                ]);

                oCity.setValueState("None");
                return;
            }

            utils._LCvalidateMandatoryField(oEvent);

            // ✅ ALWAYS WRITE TO MODEL
            const sCityText =
                oCity.getSelectedItem()?.getText() ||
                oCity.getValue() ||
                "";

            oModel.setProperty("/City", sCityText);
        },

        onChangeSalutation: function (oEvent) {

            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = sap.ui.getCore().byId("signUpGender");

            // Reset gender
            oGender.setSelectedKey("");
            oGender.setEnabled(true);

            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            }
            else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }
            // Dr. → user must choose gender manually

            // ✅ STRICT validation -- pass CONTROL, not event
            utils._LCstrictValidationSelect(oSalutation);
        },

        onChangeDOB: function (oEventOrControl) {

            const oDP =
                (typeof oEventOrControl.getSource === "function")
                    ? oEventOrControl.getSource()
                    : oEventOrControl;

            if (!oDP) return false;

            const v = oDP.getDateValue();

            if (!v) {
                oDP.setValueState("Error");
                oDP.setValueStateText(this.i18nModel.getText("dateofBirthisRequired"));
                return false;
            }

            // Age validation (10–100)
            const today = new Date();
            let age = today.getFullYear() - v.getFullYear();
            const m = today.getMonth() - v.getMonth();

            if (m < 0 || (m === 0 && today.getDate() < v.getDate())) age--;

            if (age < 10 || age > 100) {
                oDP.setValueState("Error");
                oDP.setValueStateText(this.i18nModel.getText("agemustbebetween10and100years"));
                return false;
            }
            oDP.setValueState("None");

            const sDob =
                v.getFullYear() + "-" +
                String(v.getMonth() + 1).padStart(2, "0") + "-" +
                String(v.getDate()).padStart(2, "0");

            const oModel = this.getView().getModel("LoginMode");
            oModel.setProperty("/DateOfBirth", sDob);

            return true;
        },
        onCityChange: function (oEvent) {

            const oCity = oEvent.getSource();

            // Sanitize manual typing
            oCity.setValue(oCity.getValue().replace(/[^a-zA-Z\s]/g, ""));

            const oCountry = sap.ui.getCore().byId("signUpCountry");
            const oState = sap.ui.getCore().byId("signUpState");

            const hasCountry = !!oCountry.getSelectedItem();
            const hasState = !!oState.getSelectedItem();

            // ❗ User typed a value without valid parents → reset
            if (!hasCountry || !hasState) {
                oCity.setValue("");
                oCity.setSelectedKey("");

                oCity.getBinding("items")?.filter([
                    new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
                ]);

                oCity.setValueState("None");
                return;
            }

            // Normal mandatory check when parents are valid
            utils._LCvalidateMandatoryField(oEvent);

            // 🔥 PUSH CITY TO MODEL when valid
            const oModel = this.getView().getModel("LoginMode");
            const sCityText = oCity.getSelectedItem()?.getText() || oCity.getValue() || "";
            oModel.setProperty("/City", sCityText);
        },


        onChangeGender: function (oEvent) {
            utils._LCstrictValidationSelect(oEvent.getSource());
        },

        onMobileLivechnage: function (oEvent) {

            const oInput = oEvent.getSource();

            // Digits only
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            const stdRaw = sap.ui.getCore().byId("signUpSTD").getValue() || "";
            const std = stdRaw.replace(/\s+/g, "").startsWith("+")
                ? stdRaw.replace(/\s+/g, "")
                : "+" + stdRaw.replace(/\s+/g, "");

            // ✅ NEW RULE:
            // Don't show error for empty untouched field
            if (val.length === 0) {
                oInput.setValueState("None");
                return;
            }

            // If STD not chosen yet
            if (!std) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("selectISDCodeFirst"));
                return;
            }

            // 🔥 STRICT validation while typing
            const isValid = utils._LCvalidateISDmobile(oInput, std);

            if (!isValid) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("mobileNoValueState"));
            } else {
                oInput.setValueState("None");
            }
        },
        onSTDChange: function (oEvent) {

            // 🔑 Support BOTH UI-triggered and manual calls
            const oSTD = oEvent?.getSource?.() || sap.ui.getCore().byId("signUpSTD");
            if (!oSTD) return;

            const sValue = (oSTD.getValue() || "").trim();
            const oMobile = sap.ui.getCore().byId("signUpPhone");

            // Mandatory check (only if event exists)
            if (oEvent && !utils._LCvalidateMandatoryField(oEvent)) {
                return;
            }

            const STD_REGEX = /^\+[1-9][0-9]*$/;

            if (!STD_REGEX.test(sValue)) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText(
                    "STD must start with + and contain only numbers (no leading zero)"
                );

                oMobile.setValue("");
                oMobile.setMaxLength(18);
                return;
            }

            oSTD.setValueState("None");
            oMobile.setValue("");
            oMobile.setMaxLength(sValue === "+91" ? 10 : 18);
        },


        onAddressChange: function () {
            utils._LCvalidateAddress(sap.ui.getCore().byId("signUpAddress"));
        },


        onChangeCountry: function (oEvent) {

            const oCountry = oEvent.getSource();
            oCountry.setValue(oCountry.getValue().replace(/[^a-zA-Z\s]/g, ""));

            if (!utils._LCvalidateMandatoryField(oEvent)) {
                return;
            }

            const oModel = this.getView().getModel("LoginMode");

            const oState = sap.ui.getCore().byId("signUpState");
            const oCity = sap.ui.getCore().byId("signUpCity");
            const oSTD = sap.ui.getCore().byId("signUpSTD");

            ["State", "City", "Mobileno", "STDCode"].forEach(p =>
                oModel.setProperty("/" + p, "")
            );
            oState.setSelectedKey("");
            oCity.setSelectedKey("");
            oSTD.setSelectedKey("");  
            oState.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", "__NONE__")
            ]);

            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);

            const oItem = oCountry.getSelectedItem();
            if (!oItem) return;

            const sCountryName = oItem.getText();
            const sCountryCode = oItem.getAdditionalText()?.trim();

            oModel.setProperty("/Country", sCountryName);


            const aCountries = this.getOwnerComponent()
                .getModel("CountryModel")
                .getProperty("/");

            const oMatch = aCountries?.find(c => c.countryName === sCountryName);

            if (oMatch?.stdCode) {
                oModel.setProperty("/STDCode", oMatch.stdCode);
                oSTD.setSelectedKey(oMatch.stdCode); //  correct
                this.onSTDChange();
            }

            if (sCountryCode) {
                oState.getBinding("items")?.filter([
                    new sap.ui.model.Filter(
                        "countryCode",
                        sap.ui.model.FilterOperator.EQ,
                        sCountryCode
                    )
                ]);
            }
        },

        _LCvalidateName: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },

        onCloseManageProfile: function () {
            if (this._oProfileDialog) {
                this._oProfileDialog.destroy();
                this._oProfileDialog = null;
            }
            this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", false);
        },

        onPressAvatar: async function (oEvent) {
            let oUser = this._oLoggedInUser;
            // const fullUserData = this._oLoggedInUser || {};
            let fullUserData = {};
            try {

                if (!oUser || !oUser.UserID) {
                    oUser = this.getOwnerComponent()
                        .getModel("UserModel")
                        ?.getData();
                }
                const sUserID = oUser.UserID;
                // const sUserID = oUser.UserID || "";
                if (!sUserID) {
                    sap.m.MessageToast.show(this.i18nModel.getText("usernotLoggedin"));
                    return;
                }
                fullUserData = oUser;


                if (!this._isProfileRequested) {
                    this.createAvatarActionSheet();
                    this._oProfileActionSheet.openBy(oEvent.getSource());
                    return;
                }
                this._isProfileRequested = false;

                if (this._oProfileDialog) {
                    this._oProfileDialog.destroy();
                    this._oProfileDialog = null;
                }

                if (!this._oProfileDialog) {
                    this._oProfileDialog = await sap.ui.core.Fragment.load({
                        id: this.getView().getId(),
                        name: "sap.ui.com.project1.fragment.ManageProfile",
                        controller: this
                    });
                    this.getView().addDependent(this._oProfileDialog);
                }
                const oTempModel = new JSONModel({
                    bookings: [],
                    Payments: [],
                    isEditMode: false,
                    selectedTab: "Booking History",
                    isTableBusy: true
                });

                this._oProfileDialog.setModel(oTempModel, "profileData");
                // oProfileModel.refresh(true); 
                this._oProfileDialog.open();
                this.byId("id_tabBar").setSelectedKey("Booking History");
                setTimeout(() => {
                    this.byId("id_dialog")?.addStyleClass("dialogBlur");
                }, 200);

                const filter = { UserID: sUserID }
                const response = await this.ajaxReadWithJQuery("CustomerAndPayment", filter);
                const aBookings = response?.BookingData || [];
                const aPayments = response?.PaymentData || [];

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const aBookingData = aBookings.map(booking => {
                    const oStart = booking.StartDate ? new Date(booking.StartDate) : null;
                    if (oStart) {
                        oStart.setHours(0, 0, 0, 0);
                    }

                    const startDate = booking.StartDate ? new Date(booking.StartDate) : null;
                    const endDate = booking.EndDate ? new Date(booking.EndDate) : null;
                    if (startDate) startDate.setHours(0, 0, 0, 0);
                    if (endDate) endDate.setHours(0, 0, 0, 0);

                    let bookingGroup = "Others";
                    if (booking.Status === "Cancelled") {
                        bookingGroup = "Cancelled";
                    } else if (booking.Status === "Completed") {
                        bookingGroup = "Completed";
                    } else if (booking.Status === "New" || booking.Status === "Assigned") {
                        // Ongoing = Today is between StartDate & EndDate
                        if (startDate && endDate && startDate <= today && endDate >= today) {
                            bookingGroup = "Ongoing";
                            // Upcoming = Future StartDate
                        } else if (startDate && startDate > today) {
                            bookingGroup = "Upcoming";
                        }
                    }
                    // const oStart = booking.StartDate ? new Date(booking.StartDate) : null;
                    return {
                        customerName: booking.Salutation + " " + booking.CustomerName,
                        room: booking.BedType || "",
                        Startdate: new Date(booking.StartDate).toLocaleDateString("en-GB"),
                        EndDate: booking.EndDate ? new Date(booking.EndDate).toLocaleDateString("en-GB") : "",
                        BookingDate: booking.BookingDate ? new Date(booking.BookingDate).toLocaleDateString("en-GB") : "",
                        amount: (
                            (Number(booking.TotalRoomprice || 0) + Number(booking.FacilityPrice || 0) - Number(booking.Discount || 0)) +
                            ((Number(booking.TotalRoomprice || 0) + Number(booking.FacilityPrice || 0) - Number(booking.Discount || 0)) * 0.09 * 2)
                        ).toString() || "",

                        status: booking.Status,
                        currency: booking.Currency,
                        customerID: booking.CustomerID,
                        BookingID: booking.BookingID?.toString() || "",
                    }

                });
                // Format PAYMENTS
                const aPaymentData = aPayments.map(payment => ({
                    BookingID: payment.BookingID,
                    InvNo: payment.InvNo?.toString() || "",
                    InvoiceDate: payment.InvoiceDate,
                    CustomerName: payment.CustomerName,
                    TotalAmount: payment.TotalAmount?.toString() || "",
                    DueAmount: payment.DueAmount ? payment.DueAmount.toString() : "Not Applicable",
                    currency: payment.Currency,
                    PaymentGroup: payment.Status || "Others"
                }));

                const oProfileModel = new JSONModel({
                    ...fullUserData,
                    isEditMode: false,
                    photo: "data:image/png;base64," + oUser.FileContent || "",
                    initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                    name: oUser.UserName || "",
                    UserID: oUser.UserID,
                    Salutation: oUser.Salutation,
                    email: oUser.EmailID || "",
                    phone: oUser.MobileNo || "",
                    dob: this.Formatter.DateFormat(oUser.DateOfBirth) || "",
                    gender: oUser.Gender || "",
                    address: oUser.Address || "",
                    State: oUser.State,
                    Country: oUser.Country,
                    City: oUser.City,
                    stdCode: oUser.STDCode,
                    branchCode: oUser.BranchCode,
                    role: oUser.Role,

                    bookings: aBookingData,
                    Payments: aPaymentData,
                    bookingCount: aBookingData.length,
                    paymentCount: aPaymentData.length,
                    selectedTab: "Booking History",
                    aCustomers: aBookingData.map(booking => ({ customerID: booking.customerID || CustomerID, customerName: booking.customerName })),
                    facility: [],
                    isTableBusy: false
                });
                this._oProfileDialog.setModel(oProfileModel, "profileData");
                this._applyCountryStateCityFilters();
                oProfileModel.setProperty("/isEditMode", false);
                oProfileModel.setProperty("/isTableBusy", false);
                this.byId("id_dialog").removeStyleClass("dialogBlur");

            } catch (err) {
                console.error("Profile Load Error:", err);

                const oProfileModel = new sap.ui.model.json.JSONModel({
                    ...fullUserData,
                    photo: "data:image/png;base64," + oUser.FileContent || "",
                    initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                    name: oUser.UserName || "",
                    email: oUser.EmailID || "",
                    phone: oUser.MobileNo || "",
                    dob: this.Formatter.DateFormat(oUser.DateOfBirth) || "",
                    gender: oUser.Gender || "",
                    address: oUser.Address || "",
                    bookings: [],
                    aCustomers: []
                });
                this._oProfileDialog.setModel(oProfileModel, "profileData");
                this._applyCountryStateCityFilters();
                oProfileModel.setProperty("/isEditMode", false);
                oProfileModel.refresh(true);
                this._oProfileDialog.open();
                this.byId("id_tabBar").setSelectedKey("Booking History");
                setTimeout(() => {
                    this.byId("id_dialog")?.addStyleClass("dialogBlur");
                }, 200);

            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _applyCountryStateCityFilters: function () {
            if (!this._oProfileDialog) return; // safety check

            const oModel = this._oProfileDialog.getModel("profileData");
            if (!oModel) return;

            const oCountryCB = this.byId("id_country");
            const oStateCB = this.byId("id_state");
            const oSourceCB = this.byId("id_city");

            const sCountry = oModel.getProperty("/Country") || "";
            const sState = oModel.getProperty("/State") || "";
            const sSource = oModel.getProperty("/City") || "";

            // Reset all filters
            oStateCB.getBinding("items")?.filter([]);
            oSourceCB.getBinding("items")?.filter([]);

            if (sCountry) {
                // Find countryCode by name
                const aCountryData = this.getView().getModel("CountryModel").getData();
                const oCountryObj = aCountryData.find(c => c.countryName === sCountry);

                if (oCountryObj) {
                    const sCountryCode = oCountryObj.code;

                    // Filter States by Country
                    oStateCB.getBinding("items")?.filter([
                        new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                    ]);

                    if (sState) {
                        // Filter Cities by State + Country
                        const aFilters = [
                            new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sState),
                            new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                        ];
                        oSourceCB.getBinding("items")?.filter(aFilters);
                    }
                }
            }

            // Ensure values are set back in UI
            oCountryCB.setValue(sCountry);
            oStateCB.setValue(sState);
            oSourceCB.setValue(sSource);
        },

        onEditSaveProfile: async function () {
            const oModel = this._oProfileDialog.getModel("profileData");
            var data = oModel.getData()
            const isEditMode = oModel.getProperty("/isEditMode");
            if (!isEditMode) {
                oModel.setProperty("/isEditMode", true);
                oModel.setProperty("/isEditMode", true);
                oModel.setProperty("/Country", data.Country);

                // this._applyCountryStateCityFilters();
                // this._oProfileDialog.close();
                sap.ui.core.BusyIndicator.show(0);
                // if (!this._oProfileEditDialog) {
                // this._oProfileEditDialog = await sap.ui.core.Fragment.load({
                //     name: "sap.ui.com.project1.fragment.ManageProfileEdit",
                //     controller: this
                // });
                // this.getView().addDependent(this._oProfileEditDialog);
                // this._oProfileEditDialog.setModel(oModel, "profileData");
                // }
                sap.ui.core.BusyIndicator.hide();
                // this._oProfileEditDialog.open();
                return;
            }
            const isMandatoryValid = (
                utils._LCvalidateMandatoryField(this.byId("id_Name"), "ID") &&
                utils._LCvalidateEmail(this.byId("id_mail"), "ID") &&
                this.onChangeDOB(this.byId("id_dob"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("id_country"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("id_state"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("id_city"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("id_phone"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("id_gender"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("id_address"), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                return;
            }
            const payload = {
                data: {
                    UserName: oModel.getProperty("/name"),
                    Salutation: oModel.getProperty("/Salutation"),
                    MobileNo: oModel.getProperty("/phone"),
                    EmailID: oModel.getProperty("/email"),
                    DateOfBirth: oModel.getData().dob ? oModel.getData().dob.split("/").reverse().join("-") : "",
                    Gender: oModel.getProperty("/gender"),
                    Address: oModel.getProperty("/address"),
                    City: oModel.getProperty("/City"),
                    State: oModel.getProperty("/State"),
                    Country: oModel.getProperty("/Country"),
                    STDCode: oModel.getProperty("/STDCode")
                },
                filters: { UserID: oModel.getProperty("/UserID") }
            };

            try {
                sap.ui.core.BusyIndicator.show(0);

                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                Object.assign(this._oLoggedInUser, payload.data);
                sap.m.MessageToast.show(this.i18nModel.getText("profileUpdatedSuccessfully"));

            } catch (err) {
                console.error(err);
                sap.m.MessageToast.show(this.i18nModel.getText("errorUpdatingProfile"));
            } finally {
                sap.ui.core.BusyIndicator.hide();
                oModel.setProperty("/isEditMode", false);
                // this._oProfileEditDialog.close();
                // this._oProfileDialog.open();
            }
        },

        onProfileclose: function () {
            // Close the dialog and perform logout logic
            if (this._oProfileDialog) this._oProfileDialog.close();
        },

        onEditProfilePic: function () {
            sap.m.MessageToast.show(this.i18nModel.getText("profilepictureeditnotimplementedyet"));
        },

        onProfileDialogClose: function () {
            if (this._oProfileDialog) {
                this._oProfileDialog.close();
            }
        },

        onLogout: function () {
            const oLoginModel = sap.ui.getCore().getModel("LoginModel");
            if (oLoginModel) {
                oLoginModel.setData({
                    EmployeeID: "",
                    EmployeeName: "",
                    EmailID: "",
                    Role: "",
                    BranchCode: "",
                    MobileNo: "",
                    DateofBirth: ""
                });
            }

            this._oLoggedInUser = null;

            if (this._oProfileDialog) {
                this._oProfileDialog.destroy();
                this._oProfileDialog = null;
            }

            this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", false);
        },

        _onEnterProfile: async function () {
            this._oProfileActionSheet.close();
            this._isProfileRequested = true;
            const oTempModel = new sap.ui.model.json.JSONModel({
                bookings: [],
                isTableBusy: true
            });
            this.onPressAvatar({ getSource: this.byId("ProfileAvatar") });
        },

        _onLogout: function () {
            if (this._oProfileActionSheet) {
                this._oProfileActionSheet.close();
                this._oProfileActionSheet.destroy();
                this._oProfileActionSheet = null;
            }
            if (this._oProfileDialog) {
                this._oProfileDialog.destroy();
                this._oProfileDialog = null;
            }
            sap.ui.getCore().setModel(null, "profileData");
            const oLoginModel = sap.ui.getCore().getModel("LoginModel");
            if (oLoginModel) {
                oLoginModel.setData({});
            }
            this.CommonLogoutFunction();
            this._oLoggedInUser = null;
            this._isProfileRequested = false;

            // Reset Login State
            this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", false);
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        },

        createAvatarActionSheet: function () {
            if (!this._oProfileActionSheet) {
                this._oProfileActionSheet = new sap.m.ActionSheet({
                    placement: sap.m.PlacementType.Bottom,
                    buttons: [
                        new sap.m.Button({
                            text: "View Profile",
                            icon: "sap-icon://customer",
                            press: this._onEnterProfile.bind(this)
                        }).addStyleClass("myUnifiedBtn"),

                        new sap.m.Button({
                            text: "Logout",
                            icon: "sap-icon://log",
                            press: this._onLogout.bind(this)
                        }).addStyleClass("myUnifiedBtn")
                    ]
                }).addStyleClass("profileActionSheet");
                this.getView().addDependent(this._oProfileActionSheet);
            }
        },

        Bookfragment: function () {
            if (!this.FCIA_Dialog) {
                var oView = this.getView();
                this.FCIA_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Book_Room", this);
                oView.addDependent(this.FCIA_Dialog);

                this.FCIA_Dialog.open();

            } else {
                this.FCIA_Dialog.open();
            }
        },

        onRoomBookPress: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("TilePage")
            // try {
            //     // Get the clicked button and its custom data
            //     const oButton = oEvent.getSource();
            //     const sRoomType = oButton.data("roomType"); 

            //     // Get VisibilityModel from the view
            //     const oVisibilityModel = this.getView().getModel("VisibilityModel");
            //     if (!oVisibilityModel) {
            //         sap.m.MessageToast.show("Room details not found.");
            //         return;
            //     }

            //     // Get logged-in user ID
            //     const sUserID = sap.ui.getCore().getModel("HostelModel")?.getProperty("/UserID") || "";

            //     // Get the correct price based on room type
            //     let sPrice = "";
            //     switch (sRoomType) {
            //         case "Single Bed":
            //             sPrice = oVisibilityModel.getProperty("/singlePrice");
            //             break;
            //         case "Double Bed":
            //             sPrice = oVisibilityModel.getProperty("/doublePrice");
            //             break;
            //         case "Four Bed":
            //             sPrice = oVisibilityModel.getProperty("/fourPrice");
            //             break;
            //         default:
            //             sPrice = "";
            //     }

            //     // Create or update global HostelModel
            //     const oHostelModel = new JSONModel({
            //         UserID: sUserID,
            //         RoomType: sRoomType,
            //         Price: sPrice,
            //         PaymentType: "",
            //         Person: "",
            //         StartDate: "",
            //         EndDate: ""
            //     });

            //     sap.ui.getCore().setModel(oHostelModel, "HostelModel");

            //     // Navigate to booking page
            //     this.getOwnerComponent().getRouter().navTo("RouteBookRoom");

            // } catch (err) {
            //     console.error("Booking navigation error:", err);
            //     sap.m.MessageToast.show("Error while booking room.");
            // }
        },

        onCancelDialog: function () {
            this.FCIA_Dialog.close();
        },

        onAdminPress: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteStudentDetails");
        },

        onWizardNext: function () {
            const oDialog = this.FCIA_Dialog;
            const oWizard = sap.ui.getCore().byId("idHostelWizard");
            const oNextButton = sap.ui.getCore().byId("idWizardNextBtn");
            const oBackButton = sap.ui.getCore().byId("idWizardBackBtn");
            const oSubmitButton = sap.ui.getCore().byId("idWizardSubmitBtn");

            oWizard.nextStep();

            const aSteps = oWizard.getSteps();
            const oCurrentStep = oWizard.getProgressStep();

            // If current step is last, adjust button visibility
            const bIsLast = aSteps[aSteps.length - 1].getId() === oCurrentStep.getId();

            if (bIsLast) {
                oNextButton.setVisible(false);
                oSubmitButton.setVisible(true);
            } else {
                oNextButton.setVisible(true);
                oSubmitButton.setVisible(false);
            }

            oBackButton.setEnabled(true);
        },

        onWizardBack: function () {
            const oWizard = sap.ui.getCore().byId("idHostelWizard");
            const oNextButton = sap.ui.getCore().byId("idWizardNextBtn");
            const oBackButton = sap.ui.getCore().byId("idWizardBackBtn");
            const oSubmitButton = sap.ui.getCore().byId("idWizardSubmitBtn");
            oWizard.previousStep();

            const aSteps = oWizard.getSteps();
            const oCurrentStep = oWizard.getCurrentStep();
            const bIsFirst = aSteps[0].getId() === oCurrentStep;

            oBackButton.setEnabled(!bIsFirst);
            oNextButton.setVisible(true);
            oSubmitButton.setVisible(false);
        },

        onWizardComplete: function () {
            MessageToast.show(this.i18nModel.getText("wizardcompletedsuccessfully"));
        },

        onCancelDialog: function () {
            this.FCIA_Dialog.close();
            sap.ui.getCore().byId("idHostelWizardDialog").close();
        },

        onDoubleRoomPress: function (oEvent) {

            // var oRouter = this.getOwnerComponent().getRouter();
            // oRouter.navTo("TilePage");
            this.Bookfragment()
            // if (this._oLoggedInUser === undefined) {
            //     MessageBox.alert("Please signin to book a room.");
            //     return;
            // }

            // this.Bookfragment();
            // const oButton = oEvent.getSource();
            // var price = this.getView().getModel("VisibilityModel").getData();

            // this.sRoomType = oButton.data("roomType");
            // sap.ui.getCore().byId("idRoomType").setValue(this.sRoomType);
            // sap.ui.getCore().byId("idPrice1").setValue(price.doublePrice);
            // sap.ui.getCore().byId("idFullName").setValue(this._oLoggedInUser.UserName);
            // sap.ui.getCore().byId("idE-mail").setValue(this._oLoggedInUser.EmailID);
            // sap.ui.getCore().byId("idMobile").setValue(this._oLoggedInUser.MobileNo);

        },

        SectionPress: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) return;

            var oContext = oSelectedItem.getBindingContext("profileMenuModel");
            var oSectionData = oContext ? oContext.getObject() : null;

            if (oSectionData) {
                if (oSectionData.key === "logout") {
                    var oView = this.getView();
                    if (oView.byId("loginButton")) oView.byId("loginButton").setVisible(true);
                    if (oView.byId("ProfileAvatar")) oView.byId("ProfileAvatar").setVisible(false);
                    if (this._oProfileDialog) this._oProfileDialog.close();
                } else {
                    // Update the dialog's section model, not the view’s
                    if (this._oProfileDialog) {
                        var oSectionModel = this._oProfileDialog.getModel("profileSectionModel");
                        if (oSectionModel) {
                            oSectionModel.setProperty("/selectedSection", oSectionData.key);
                        }
                    }
                }
            }
        },

        onSearchChange: function (oEvent) {
            var sBranchCode = oEvent.getParameter("value").trim();
            if (!sBranchCode) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseenterlocationsearch"));
                return;
            }
            // Call your function with new search value
            this._loadFilteredData(sBranchCode);
        },

        FC_onPressClear: function () {
            const oView = this.getView();
            const oBranchCombo = oView.byId("id_Branch");
            const oAreaTypeCombo = oView.byId("id_Area");
            const oRoomTypeCombo = oView.byId("id_Roomtype");

            // 🔹 Reset all selected keys
            if (oBranchCombo) oBranchCombo.setSelectedKey("");
            if (oAreaTypeCombo) oAreaTypeCombo.setSelectedKey("");
            if (oRoomTypeCombo) oRoomTypeCombo.setSelectedKey("");

            // 🔹 Make Area and Room Type non-editable
            if (oAreaTypeCombo) oAreaTypeCombo.setEnabled(false);
            if (oRoomTypeCombo) oRoomTypeCombo.setEnabled(true);
        },

        onPressBookingRow: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("profileData");
            var oBookingData = oContext.getObject();

            // Now reuse your logic exactly as in onEditBooking
            var oProfileModel = this._oProfileDialog.getModel("profileData");
            var aCustomers = oProfileModel.getProperty("/aCustomers");
            var aFacilities = oProfileModel.getProperty("/facility");

            var sCustomerID = oBookingData.customerID || oBookingData.CustomerID || "";

            if (!sCustomerID) {
                sap.m.MessageToast.show(this.i18nModel.getText("customerIDnotfoundforthisBooking"));
                return;
            }

            var oCustomer = aCustomers.find(cust => cust.customerID === sCustomerID);
            if (!oCustomer) {
                sap.m.MessageToast.show(this.i18nModel.getText("noCustomerDetailsfoundforthisBooking"));
                return;
            }

            var aCustomerFacilities = aFacilities.filter(fac => fac.customerid === sCustomerID);

            // Calculate totals
            var oTotals = this.calculateTotals(
                [{
                    FullName: oCustomer.customerName,
                    Facilities: {
                        SelectedFacilities: aCustomerFacilities
                    }
                }],
                oBookingData.Startdate,
                oBookingData.EndDate,
                oBookingData.RoomPrice
            );
            if (!oTotals) {
                return;
            }

            // Prepare data for details view
            var oFullCustomerData = {
                salutation: oCustomer.salutation,
                FullName: oCustomer.customerName,
                Gender: oCustomer.gender,
                stdcode: oCustomer.stdCode,
                MobileNo: oCustomer.mobileno,
                CustomerEmail: oCustomer.customerEmail,
                Country: oCustomer.country,
                State: oCustomer.state,
                City: oCustomer.city,
                DateOfBirth: oCustomer.DOB,
                RoomType: oBookingData.room,
                Price: oBookingData.amount,
                noofperson: oBookingData.noofperson,
                RoomPrice: oBookingData.RoomPrice,
                PaymentType: oBookingData.paymenytype,
                StartDate: oBookingData.Startdate,
                EndDate: oBookingData.EndDate || "",
                CustomerId: oBookingData.cutomerid,
                TotalDays: oTotals.TotalDays,
                AllSelectedFacilities: oTotals.AllSelectedFacilities,
                TotalFacilityPrice: oTotals.TotalFacilityPrice,
                GrandTotal: oTotals.GrandTotal
            };

            // Set model for next screen
            var oHostelModel = new sap.ui.model.json.JSONModel(oFullCustomerData);
            this.getOwnerComponent().setModel(oHostelModel, "HostelModel");

            // Navigate
            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(sCustomerID)
            });
        },

        onPressManageInvoice: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("profileData").getObject().InvNo), dash: "ManageInvoice" });
        },

        //  Separated calculation function
        calculateTotals: function (aPersons, sStartDate, sEndDate, RoomPrice) {
            const oStartDate = this._parseDate(sStartDate);
            const oEndDate = this._parseDate(sEndDate);

            if (!oStartDate || !oEndDate) {
                sap.m.MessageToast.show(this.i18nModel.getText("invalidStartEndDate"));
                return null;
            }

            const diffTime = oEndDate - oStartDate;
            const iDays = Math.ceil(diffTime / (1000 * 3600 * 24));

            if (iDays <= 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("endDatemustbeafterStartDate"));
                return null;
            }

            let totalFacilityPricePerDay = 0;
            let aAllFacilities = [];

            aPersons.forEach((oPerson, iIndex) => {
                const aFacilities = oPerson.Facilities?.SelectedFacilities || [];

                aFacilities.forEach((f) => {
                    // Defensive coding to avoid undefined values
                    const sFacilityName = f.facilitiname || f.facilityname || "N/A";
                    const fPrice = parseFloat(f.facilitiPrice || f.facilitiPrice || 0);
                    const fTotal = (fPrice * iDays).toFixed(2);
                    const aEndDate = f.enddate

                    totalFacilityPricePerDay += fPrice;

                    aAllFacilities.push({
                        PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
                        FacilityName: sFacilityName,
                        Price: fPrice,
                        StartDate: sStartDate,
                        EndDate: aEndDate,
                        TotalDays: iDays,
                        TotalAmount: fTotal,
                        Image: f.Image || f.image || ""
                    });
                });
            });

            const totalFacilityPrice = totalFacilityPricePerDay * iDays;
            const grandTotal = totalFacilityPrice + Number(RoomPrice || 0);

            return {
                TotalDays: iDays,
                TotalFacilityPrice: totalFacilityPrice,
                GrandTotal: grandTotal,
                AllSelectedFacilities: aAllFacilities
            };
        },

        // 🗓️ Helper date parser
        _parseDate: function (sDate) {
            if (!sDate) return null;

            // If it's already a Date object
            if (sDate instanceof Date) {
                return sDate;
            }

            // Convert from DD/MM/YYYY or YYYY-MM-DD
            if (sDate.includes("/")) {
                const [d, m, y] = sDate.split("/");
                return new Date(`${y}-${m}-${d}`);
            } else {
                return new Date(sDate);
            }
        },

        onBranchSelectionChange: function (oEvent) {
            const oView = this.getView();
            const oAreaCombo = oView.byId("id_Area");
            const oRoomType = oView.byId("id_Roomtype");

            // Reset previous selections
            oAreaCombo.setSelectedKey("").setEnabled(false);
            oRoomType.setSelectedKey("");

            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;

            // 🔹 Selected Branch Name
            const sSelectedBranch = oSelectedItem.getText();

            // 🔹 Fetch existing Branch model data
            const oModelData = oView.getModel("sBRModel").getData();

            // 🔹 Filter the data for the selected branch name
            const aFiltered = oModelData.filter(function (item) {
                return item.City === sSelectedBranch;
            });

            // 🔹 Update Area model dynamically
            const oAreaModel = new sap.ui.model.json.JSONModel(aFiltered);
            oView.setModel(oAreaModel, "AreaModel");

            // 🔹 Enable the Area dropdown now that data is ready
            oAreaCombo.setEnabled(true);
        },

        // 🔹 When Area is selected, enable Room Type combo
        onAreaSelectionChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");

            const oRoomType = this.byId("id_Roomtype");
            const oSelectedItem = oEvent.getSource().getSelectedItem();

            if (oSelectedItem) {
                oRoomType.setEnabled(true);
            } else {
                oRoomType.setEnabled(true);
            }
        },

        onSearchRooms: async function () {
            this.flag = true
            const oContainer = this.byId("idBedTypeFlex");
            oContainer.setBusy(true);

            // City
            var oBranchcity = this.byId("id_Branch").getSelectedKey() ||
                this.byId("id_Branch").getValue();

            if (!oBranchcity) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectCity"));
                oContainer.setBusy(false);
                return;
            }

            // AC Type
            const sSelectedACType = this.byId("id_Roomtype")?.getSelectedKey();

            if (sSelectedACType === "") {
                this.byId("id_Roomtype").setSelectedKey("All")
            }
            if (sSelectedACType === "All" || oBranchcity) {
                this.iTop = 4
                this.iSkip = 0
            }
            if (sSelectedACType === "AC" || oBranchcity) {
                this.iTop = 4
                this.iSkip = 0
            }
            if (sSelectedACType === "Non-Ac" || oBranchcity) {
                this.iTop = 4
                this.iSkip = 0
            }

            // Locality ComboBox
            var oAreaCB = this.byId("id_Area");
            var sSelectedBranch = oAreaCB.getSelectedKey() || oAreaCB.getValue();

            var areaList = this.getView().getModel("AreaModel").getData() || [];

            // Check if selected or typed locality is valid
            var validArea = areaList.find(item =>
                item.Address === sSelectedBranch || item.BranchID === sSelectedBranch
            );

            if (sSelectedBranch && !validArea) {
                // User typed something, but it does not match the list
                MessageToast.show(this.i18nModel.getText("pleaseselectlocality"));
                oContainer.setBusy(false);
                return;
            }

            // If locality is empty, keep it empty (search by city only)
            var finalBranch = validArea ? validArea.BranchID : "";
              if(finalBranch===""){
                this.byId("id_Area").setValueState("None");
            }
            try {
                await this._loadFilteredData(oBranchcity, finalBranch, sSelectedACType);
            } catch (e) {
                console.error(e);
            } finally {
                oContainer.setBusy(false);
            }
        },

        model: function (response) {
            const aRooms = response.data.HM_Rooms || [];
            const oRoomModel = new JSONModel({ Rooms: aRooms });
            this.getView().setModel(oRoomModel, "RoomCountModel");

            const aCustomers = Array.isArray(response.data.HM_RoomData) ? response.data.HM_RoomData : [response.data.HM_RoomData];

            const oCustomerModel = new JSONModel(aCustomers);
            this.getView().setModel(oCustomerModel, "CustomerModel");
        },

        _loadFilteredData: async function (Scity, sBranchCode, sACType) {
            const oView = this.getView();
            const oVisibilityModel = oView.getModel("VisibilityModel")

            if (sACType === "All") {
                sACType = "";
            } else {
                sACType = this.getView().byId("id_Roomtype").getSelectedKey()
            }

            if (sACType === "All") {
                sACType = "";
            }

            try {

                const oView = this.getView();

                var aBranchCodes = [];
                var oBRModel = this.getView().getModel("sBRModel");
                var aBranchesData = oBRModel.getData(); // adjust path if needed
                var sBranchCode = this.byId("id_Area").getSelectedKey() || this.byId("id_Area").getValue();


                if (Scity && !sBranchCode) {
                    // Filter branches by city
                    var aFilteredBranches = aBranchesData.filter(function (branch) {
                        return branch.City === Scity;
                    });

                    if (aFilteredBranches.length === 0) {
                        const oVisibilityModel = this.getView().getModel("VisibilityModel");
                        oVisibilityModel.setProperty("/BedTypes", []);
                        oVisibilityModel.setProperty("/NoData", true);
                        oVisibilityModel.setProperty("/ShowViewMore", false);
                        return;
                    }

                    aBranchCodes = aFilteredBranches.map(function (branch) {
                        return branch.BranchID;
                    });

                } else if (sBranchCode) {
                    // Branch already selected
                    aBranchCodes = [sBranchCode];
                }

                let response;
                response = await this.ajaxReadWithJQuery("BookingBedTypeRoomReadCall", {
                    BranchCode: aBranchCodes,
                    ACType: sACType,
                    top: this.iTop,
                    skip: this.iSkip
                });
                await this.model(response)

                let matchedRooms = response.data.HM_BedType || [];
                   let HM_RoomCount=response.data.HM_RoomCount

                // if (sACType) {
                //     matchedRooms = matchedRooms.filter(
                //         room => room.ACType?.toLowerCase() === sACType.toLowerCase()
                //     );
                // }

                // if (sBranchCode && sBranchCode.trim() !== "") {
                //     matchedRooms = matchedRooms.filter(
                //         room =>
                //             room.BranchCode?.toLowerCase() === sBranchCode.toLowerCase()
                //     );
                // } else {
                //     matchedRooms = matchedRooms.filter(
                //         room =>
                //             aBranchCodes
                //                 .map(code => code.toLowerCase())
                //                 .includes(room.BranchCode?.toLowerCase())
                //     );
                // }

                const oRoomDetailsModel = oView.getModel("RoomCountModel");
                const oCustomerModel = oView.getModel("CustomerModel");

                const roomDetails = oRoomDetailsModel.getData()?.Rooms || [];
                const customerData = oCustomerModel.getData() || [];


                const oBranchModel = oView.getModel("sBRModel");
                const aBranchData = oBranchModel?.getData() || [];

                const convertBase64ToImage = (base64String, fileType) => {
                    if (!base64String) return "./image/Fallback.png";
                    let sBase64 = base64String.replace(/\s/g, "");
                    try {
                        if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
                            const decoded = atob(sBase64);
                            if (decoded.startsWith("iVB")) sBase64 = decoded;
                        }
                    } catch (e) { }

                    const mimeType = fileType || "image/jpeg";
                    if (sBase64.startsWith("data:image")) return sBase64;
                    return `data:${mimeType};base64,${sBase64}`;
                };

                const aBedTypes = matchedRooms.map(room => {
                    const matchingRooms = roomDetails.filter(
                        rd =>
                            rd.BranchCode?.toLowerCase() === room.BranchCode?.toLowerCase() &&
                            rd.BedTypeName?.trim().toLowerCase() ===
                            (room.Name?.trim().toLowerCase() +
                                " - " +
                                room.ACType?.trim().toLowerCase())
                    );

                    const firstRoom = matchingRooms[0];
                    const getValidPrice = (value) => value && value !== "0.00" && value !== "0";

                    const BasicPrice =
                        (getValidPrice(firstRoom?.Price) ? " " + firstRoom.Price : "") ||
                        (getValidPrice(firstRoom?.MonthPrice) ? " " + firstRoom.MonthPrice : "") ||
                        (getValidPrice(firstRoom?.YearPrice) ? " " + firstRoom.YearPrice : "");

                    const price = firstRoom?.Price ? " " + firstRoom.Price : "";
                    const MonthPrice = firstRoom?.MonthPrice ? " " + firstRoom.MonthPrice : "";
                    const YearPrice = firstRoom?.YearPrice ? " " + firstRoom.YearPrice : "";
                    const Currency = firstRoom?.Currency ? " " + firstRoom.Currency : "";

                    // let totalBooked = 0;
                    // let totalCapacity = 0;

                    // totalCapacity = Number(room.NoOfPerson) * Number(room.MaxBeds) || 0;
                    // matchingRooms.forEach(rm => {
                    //     const bookedCount = customerData.filter(cust =>
                    //         cust.BranchCode?.toLowerCase() === rm.BranchCode?.toLowerCase() &&
                    //         cust.BedType?.trim().toLowerCase() === rm.BedTypeName?.trim().toLowerCase() &&
                    //         cust.Status === "Assigned"
                    //     ).length;
                    //     totalBooked = bookedCount;
                    // });


                    // var AvailbleBeds = totalCapacity - totalBooked
                    // const isFull = totalBooked >= totalCapacity && totalCapacity > 0;
                   const isVisible = room?.Status === "Available";

                     const PriceVisible= price !== "" || MonthPrice !== "" || YearPrice !== ""
                

                    const oBranchInfo = aBranchData.find(b =>
                        b.BranchID?.toLowerCase() === room.BranchCode?.toLowerCase()
                    );
                    // const sLogo = oBranchInfo?.Photo1 ? `data:${oBranchInfo.Photo1Type};base64,${oBranchInfo.Photo1}` : "";
                    const sArea = oBranchInfo?.Address || "";
                    const sCountry = oBranchInfo?.Country || "";

                    const aImages = [];
                    for (let i = 1; i <= 5; i++) {
                        const base64 = room[`Photo${i}`];
                        const type = room[`Photo${i}Type`];
                        if (base64) {
                            aImages.push({
                                src: convertBase64ToImage(base64, type),
                                Area: sArea
                            });
                        }
                    }
                    return {
                        Name: room.Name,
                        ACType: room.ACType,
                        NoOfPerson: room.NoOfPerson,
                        Description: room.Description || "",
                        Price: price,
                        BasicPrice: BasicPrice,
                        MonthPrice: MonthPrice,
                        YearPrice: YearPrice,
                        Currency: Currency,
                        BranchCode: room.BranchCode,
                        Images: aImages,
                        Country: sCountry,
                        PriceVisible: PriceVisible,
                        Visible: isVisible,
                        AvailbleBeds: room.AvailableRooms
                    };
                });

                const aExisting = oVisibilityModel.getProperty("/BedTypes") || [];
                let aFinal;

                if (this.flag) { // Search / filter
                    aFinal = aBedTypes;
                    this.iSkip = aBedTypes.length;
                } else { // View More
                    aFinal = aExisting.concat(aBedTypes);
                    this.iSkip += this.iTop;
                    //  this.iTop= this.iSkip * this.iSkip
                }
                this.Scity = Scity
                this.sACType = sACType

                this.sBranchCode = sBranchCode

                aFinal = aFinal.filter(b => b.PriceVisible !== false);

                oVisibilityModel.setProperty("/BedTypes", aFinal);
                oVisibilityModel.setProperty("/ShowViewMore", aFinal.length !== HM_RoomCount);
                if (oView.getModel("VisibilityModel").getData().BedTypes.length === 0) {
                    oView.getModel("VisibilityModel").setProperty("/NoData", true);
                } else {
                    oView.getModel("VisibilityModel").setProperty("/NoData", false);
                }
            } catch (err) {
                console.error("Error loading data:", err);
                sap.m.MessageToast.show(this.i18nModel.getText("failedloadbedtypedata"));
            }
        },

        onBookNow: function (oEvent) {
            // Get selected bed type object
            const oItem = oEvent.getSource().getBindingContext("VisibilityModel").getObject();

            let oHostelModel = sap.ui.getCore().getModel("HostelModel");
            if (!oHostelModel) {
                oHostelModel = new sap.ui.model.json.JSONModel({});
                sap.ui.getCore().setModel(oHostelModel, "HostelModel");
            }

            //  Set RoomType and Price in HostelModel
            oHostelModel.setProperty("/RoomType", oItem.Name || "");
            oHostelModel.setProperty("/Price", oItem.Price || 0);
            oHostelModel.setProperty("/ACType", oItem.ACType || 0);
            oHostelModel.setProperty("/BranchCode", oItem.BranchCode || 0);


            // Optionally set other details
            oHostelModel.setProperty("/Image", oItem.Image || "");
            oHostelModel.setProperty("/Description", oItem.Description || "");


            //  Navigate to the booking route (or open fragment)
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBookRoom");
        },

        onFormEdit: async function () {
            var oSaveModel = this.getView().getModel("saveModel");
            var oedit = oSaveModel.getProperty("/isEditMode");
            var oEdit = this._oProfileDialog.getModel("profileData").getData();
            if (!oedit) {
                oSaveModel.setProperty("/isEditMode", true);
                return;
            }
            var oPayload = {
                UserName: oEdit.name
            }

            const oId = this._oLoggedInUser || {};
            const ID = oId.UserID || "";
            const filter = {
                UserID: ID
            };
            try {
                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: oPayload,
                    filters: filter
                });
                sap.m.MessageToast.show(this.i18nModel.getText("dataSavedSuccessfully"));
                oSaveModel.setProperty("/isEditMode", false);
            } catch (error) {
                sap.m.MessageToast.show(this.i18nModel.getText("failed"));
            }
        },
        OnpressBookingDetails: function () {

        },
        //.,.,.,.,.,.
        FSM_onConfirm: function (oEvent) {

            const oInput = oEvent?.getSource();
            if (!oInput) return false;

            const confirm = (oInput.getValue() || "").trim();
            const pass = sap.ui.getCore().byId("signUpPassword").getValue().trim();

            // Required
            if (!confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("confirmPasswordRequired"));
                return false;      // ✅ EXPLICIT FAIL
            }

            // Compare
            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                return false;      // ✅ EXPLICIT FAIL
            }

            // Success
            oInput.setValueState("None");
            return true;           // ✅ EXPLICIT PASS
        },

        Forget_onConfirm: function (oEvent) {
            const confirm = oEvent.getSource().getValue().trim();
            const pass = sap.ui.getCore().byId("newPass").getValue().trim();
            const oInput = sap.ui.getCore().byId("confPass");

            if (!confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("confirmPasswordRequired"));
                return;
            }

            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                return;
            }

            oInput.setValueState("None");
            oInput.setValueStateText(this.i18nModel.getText("passwordsmatched"));
        },

        onOtpLive: function (oEvent) {
            const sInput = oEvent.getSource();
            const sVal = oEvent.getParameter("value").replace(/\D/g, ""); // allow digits only

            sInput.setValue(sVal);

            // Keep it in error state until full 6 digits
            if (sVal.length === 6) {
                sInput.setValueState(sap.ui.core.ValueState.None);
            } else {
                sInput.setValueState(sap.ui.core.ValueState.Error);
                sInput.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
            }
        },

        onBackToForgot: function () {
            const vm = this.getView().getModel("LoginViewModel");
            vm.setProperty("/authFlow", "forgot");
            vm.setProperty("/forgotStep", 1); // RESET to step 1
        },

        onForgotPassword: function () {
            const vm = this.getView().getModel("LoginViewModel");

            vm.setProperty("/authFlow", "forgot");
            vm.setProperty("/forgotStep", 1); // safe, runtime only
            vm.setProperty("/dialogTitle", "Set / Reset Password"); //
            this._addPasswordGenerateIcon();
        },

        onSelectLoginMode: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const mode = e.getSource().getText().toLowerCase(); // "password" or "otp"

            vm.setProperty("/loginMode", mode);

            // 🔥 Always reset OTP field visibility when switching modes
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            // 🔥 Clean OTP input field and disable it
            const otpCtrl = sap.ui.getCore().byId("signInOTP");
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }

            // 🔥 Reset password field too (fresh mode)
            const passCtrl = sap.ui.getCore().byId("signinPassword");
            if (passCtrl) {
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }

            // 🔥 Hide Send OTP button unless user is in OTP mode
            const btnSendOtp = sap.ui.getCore().byId("btnSignInSendOTP");
            if (btnSendOtp) {
                btnSendOtp.setVisible(mode === "otp");
            }
        },

        _clearAllAuthFields: function () {
            const ids = [
                "signInuserid", "signInusername", "signinPassword",
                "fpUserId", "fpUserName", "fpOTP",
                "newPass", "confPass", "loginOTP"
            ];
            ids.forEach(id => {
                const c = sap.ui.getCore().byId(id);
                if (c) {
                    c.setValue("");
                    c.setValueState("None");
                }
            });
            this._storedLoginCreds = null;
            this._oResetUser = null;
            this._resetOtpState();
        },

        _resetAuthDialog: function () {
            const oModel = this.getView().getModel("LoginMode");

            // Reset LoginMode data (your existing block)
            oModel.setData({
                Salutation: "",
                fullname: "",
                Email: "",
                STDCode: "",
                Mobileno: "",
                password: "",
                comfirmpass: "",
                UserID: "",
                Gender: "",
                Country: "",
                State: "",
                City: "",
                Address: "",
                DateOfBirth: ""
            });
            //  Reset UI controls
            //  Reset Sign-Up controls
            [
                "signUpSalutation", "signUpName", "signUpEmail", "signUpPassword",
                "signUpConfirmPassword", "signUpDOB", "signUpGender", "signUpCountry",
                "signUpState", "signUpCity", "signUpSTD", "signUpPhone", "signUpAddress"
            ].forEach(id => {
                const ctrl = $C(id);
                if (ctrl) {
                    ctrl.setValueState("None");
                    if (ctrl.setValue) ctrl.setValue("");
                    if (ctrl.setSelectedKey) ctrl.setSelectedKey("");
                }
            });

            //  Reset Sign-In controls
            ["signInuserid", "signInusername", "signinPassword"].forEach(id => {
                const ctrl = $C(id);
                if (ctrl) {
                    ctrl.setValueState("None");
                    if (ctrl.setValue) ctrl.setValue("");
                }
            });


            // Re-enable STD & Gender
            const STD = $C("signUpSTD");
            const GEN = $C("signUpGender");
            if (STD) STD.setEnabled(true);
            if (GEN) GEN.setEnabled(true);

            // Reset account type
            const oVM = this.getView().getModel("LoginViewModel");
            oVM.setProperty("/selectedAccountType", "personal");
            oVM.setProperty("/authFlow", "signin");
            this._resetOtpState();

            // Clear all fields including forgot/otp/reset
            this._clearAllAuthFields();

            // Remove blur effect from the background
            this.getView().removeStyleClass("blur-background");

            // Ensure only Sign In panel is visible when dialog opens next time

        },

        _showPanel: function (panelId) {
            const aPanels = [
                "signInPanel",
                "signUpPanel",
                "forgotFlowPanel"
            ];

            aPanels.forEach(id => {
                const c = sap.ui.getCore().byId(id);
                if (c) {
                    c.setVisible(id === panelId);
                }
            });
        },

        onSubmitNewPassword: async function () {
            const oNew = sap.ui.getCore().byId("newPass");
            const oConf = sap.ui.getCore().byId("confPass");

            const pass = oNew.getValue().trim();
            const confirm = oConf.getValue().trim();

            // RESET state before validation
            oNew.setValueState("None");
            oConf.setValueState("None");

            // 1) Required check for New Password
            if (!pass) {
                oNew.setValueState("Error");
                oNew.setValueStateText(this.i18nModel.getText("passwordRequired"));
                sap.m.MessageToast.show(this.i18nModel.getText("passwordRequired"));
                return;
            }

            // 2) Format rule check
            if (!utils._LCvalidatePassword(oNew)) {
                oNew.setValueState("Error");
                oNew.setValueStateText(this.i18nModel.getText("mustContainUppercaseLowercaseNumberSpecialCharacter"));
                return;
            }

            // 3) Required check for Confirm Password
            if (!confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText(this.i18nModel.getText("confirmPasswordRequired"));
                sap.m.MessageToast.show(this.i18nModel.getText("confirmPasswordRequired"));
                return;
            }

            // 4) Match both
            if (pass !== confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                sap.m.MessageToast.show(this.i18nModel.getText("nopasswordmatch"));
                return;
            }

            // 🔥 PASSED ALL VALIDATIONS → SUCCESS STATE
            oConf.setValueState("None");
            // oConf.setValueStateText("Passwords matched");
            sap.ui.core.BusyIndicator.show(0);
            try {
                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: { Password: btoa(pass) },
                    filters: { UserID: this._oResetUser?.UserID }
                });


                sap.m.MessageBox.success("Password updated successfully", {
                    title: "Success",
                    onClose: () => {

                        // fully clean values
                        this._clearAllAuthFields?.();
                        this._clearForgotFlow?.();

                        // reset dialog title
                        sap.ui.getCore().byId("authDialog").getCustomHeader().getContentMiddle()[0].setText("Hostel Access Portal");

                        // switch flow back to signin
                        const vm = this.getView().getModel("LoginViewModel");
                        vm.setProperty("/authFlow", "signin");

                        // show login panel
                        vm.setProperty("/authFlow", "signin");
                        vm.setProperty("/forgotStep", 1);
                        vm.setProperty("/dialogTitle", "Hostel Access Portal");
                    }
                });

            } catch (err) {
                sap.m.MessageToast.show(this.i18nModel.getText("passwordResetFailed"));
            }
            finally {
                sap.ui.core.BusyIndicator.hide();  // ALWAYS stop
                this._resetOtpState();
            }
        },

        _resetAllAuthFields: function () {
            ["signInuserid", "signInusername", "signinPassword",
                "fpUserId", "fpUserName", "fpOTP", "newPass", "confPass", "loginOTP"
            ]
                .forEach(id => {
                    let o = sap.ui.getCore().byId(id);
                    if (o) o.setValue("");
                });
        },

        _verifyOTPWithBackend: async function (otp) {
            sap.ui.core.BusyIndicator.show(0);

            try {
                const oPayload = {
                    UserID: this._oResetUser.UserID,
                    UserName: this._oResetUser.UserName,
                    OTP: otp.trim()
                };

                // Call the BaseController Generic Read method
                const oResp = await this.ajaxReadWithJQuery("HM_Login", oPayload);

                return oResp?.success === true;

            } catch (err) {
                console.error("OTP Verify Error:", err);
                return false;

            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onLoginOtpLive: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const input = e.getSource();

            // allow only digits and enforce 6 max
            let val = e.getParameter("value").replace(/\D/g, "");
            if (val.length > 6) val = val.slice(0, 6);

            input.setValue(val);

            const isValid = val.length === 6;
            vm.setProperty("/isOtpEntered", isValid);

            if (val.length === 0) {
                input.setValueState("None");
            } else if (!isValid) {
                input.setValueState("Error");
                input.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
            } else {
                input.setValueState("None");
            }
        },

        onPressOTP: async function () {
            const oUserIdCtrl = sap.ui.getCore().byId("signInuserid");
            const oUserNameCtrl = sap.ui.getCore().byId("signInusername");

            const sUserId = oUserIdCtrl.getValue().trim();
            const sUserName = oUserNameCtrl.getValue().trim();

            // Validate inputs
            if (!utils._LCvalidateMandatoryField(oUserIdCtrl, "ID") ||
                !utils._LCvalidateMandatoryField(oUserNameCtrl, "ID")) {
                sap.m.MessageToast.show(this.i18nModel.getText("enterValidUserIDUserName"));
                return;
            }

            const payload = {
                UserID: sUserId,
                UserName: sUserName,
                Type: "OTP"
            };

            sap.ui.core.BusyIndicator.show(0);

            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);

                if (oResp?.success) {

                    sap.m.MessageToast.show(this.i18nModel.getText("oTPSentCheckyourEmail"));
                    // alert(oResp.OTP);

                    this._oResetUser = { UserID: sUserId, UserName: sUserName };

                    const vm = this.getView().getModel("LoginViewModel");

                    // Show OTP input
                    vm.setProperty("/showOTPField", true);

                    const oOtpCtrl = sap.ui.getCore().byId("signInOTP");
                    oOtpCtrl.setEnabled(true);
                    oOtpCtrl.setValue("");
                    oOtpCtrl.setValueState("None");
                    oOtpCtrl.setValueStateText("");
                    oOtpCtrl.focus();

                    // 🔥 THIS WAS MISSING
                    this._startOtpTimer();     // ✅ start 20 sec resend cooldown

                }
                else {
                    sap.m.MessageToast.show(this.i18nModel.getText("usernotFoundUnabletoSendOTP"));
                }

            } catch (err) {
                sap.m.MessageToast.show(this.i18nModel.getText("invalidCredentialsPleasetryagain"));
                console.error("OTP Send Error:", err);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _onVerifyOTP: async function () {

            const vm = this.getView().getModel("LoginViewModel");
            const flow = vm.getProperty("/authFlow");

            // Resolve OTP control by flow
            const oOtpInput = (flow === "forgot")
                ? sap.ui.getCore().byId("fpOTP")
                : sap.ui.getCore().byId("signInOTP");

            const otp = oOtpInput.getValue().trim();

            // --- Basic validation ---
            if (!otp) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText(this.i18nModel.getText("pleaseEnterOTP"));
                sap.m.MessageToast.show(this.i18nModel.getText("enterOTP"));
                return;
            }

            if (!/^\d{6}$/.test(otp)) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                sap.m.MessageToast.show(this.i18nModel.getText("invalidOTP"));
                return;
            }

            // Clear any previous error state
            oOtpInput.setValueState(sap.ui.core.ValueState.None);
            oOtpInput.setValueStateText("");

            // --- Backend verification ---
            let isValid = false;

            try {
                isValid = await this._verifyOTPWithBackend(otp);
            } catch (e) {
                sap.m.MessageToast.show(this.i18nModel.getText("oTPVerificationFailed"));
                console.error("OTP verify error:", e);
                return;
            }

            if (!isValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("incorrectOTP"));
                return;
            }

            // ✅ OTP accepted: reset resend cooldown state
            this._resetOtpCooldown();

            // --------------------------
            // 📌 Forgot Password Flow
            // --------------------------
            if (flow === "forgot") {
                vm.setProperty("/forgotStep", 3);
                return;
            }

            // --------------------------
            // 📌 Normal OTP Login Flow
            // --------------------------
            try {

                const resp = await this.ajaxReadWithJQuery("HM_Login", {
                    UserID: this._oResetUser?.UserID,
                    UserName: this._oResetUser?.UserName,
                    OTP: otp
                });

                sap.m.MessageToast.show(this.i18nModel.getText("loginSuccessful"));
                this._setLoggedInUser(resp.data[0]);
                this._resetAllAuthFields();
                this._oSignDialog.close();

            } catch (e) {

                sap.m.MessageToast.show(this.i18nModel.getText("loginFailed"));
                console.error("OTP login error:", e);

            }
        },

        onShowForgotUser: function () {
            this._showForgotSection("secForgotUser");
        },

        onBackToLogin: function () {

            // Clean auth data & any internal flags
            this._clearAllAuthFields();

            // Reset only values (not visibility/enabled state)

            sap.ui.getCore().byId("fpUserId").setValue("");
            sap.ui.getCore().byId("fpUserName").setValue("");
            sap.ui.getCore().byId("fpOTP").setValue("");
            sap.ui.getCore().byId("newPass").setValue("");
            sap.ui.getCore().byId("confPass").setValue("");

            // Update flow using ViewModel
            const vm = this.getView().getModel("LoginViewModel");
            vm.setProperty("/loginMode", "password");
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/forgotStep", 1);

            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/forgotStep", 1);
            vm.setProperty("/dialogTitle", "Hostel Access Portal");
            this._resetOtpState();

        },

        _setLoggedInUser: function (user) {
            const oLoginModel = this.getView().getModel("LoginModel");

            oLoginModel.setProperty("/EmployeeID", user.UserID);
            oLoginModel.setProperty("/EmployeeName", user.UserName);
            oLoginModel.setProperty("/EmailID", user.EmailID);
            oLoginModel.setProperty("/Role", user.Role);
            oLoginModel.setProperty("/BranchCode", user.BranchCode || "");
            oLoginModel.setProperty("/MobileNo", user.MobileNo || "");
            oLoginModel.setProperty("/DateofBirth", user.DateOfBirth || "");

            this._oLoggedInUser = user;

            if (user.Role === "Customer") {
            } else {
                this.getOwnerComponent().getRouter().navTo("TilePage");
            }
        },

        onPressAvatarEdit: function (oEvent) {
            this._oAvatarActionSheet = new sap.m.ActionSheet({
                buttons: [
                    new sap.m.Button({
                        text: "Take Photo",
                        icon: "sap-icon://camera",
                        press: this.onTakePhoto.bind(this)
                    }),
                    new sap.m.Button({
                        text: "Upload from Gallery",
                        icon: "sap-icon://add-photo",
                        press: this.onUploadPhoto.bind(this)
                    }),
                    new sap.m.Button({
                        text: "Remove Photo",
                        icon: "sap-icon://delete",
                        type: "Reject",
                        press: this.onRemovePhoto.bind(this)
                    })
                ],
                placement: "Bottom"
            });
            this.getView().addDependent(this._oAvatarActionSheet);
            this._oAvatarActionSheet.openBy(oEvent.getSource());
        },

        _StartCamera: function () {
            var oVideo = document.getElementById("video");
            if (!oVideo) return;

            // Create segmentation instance only once
            if (!this.selfieSegmentation) {
                this.selfieSegmentation = new SelfieSegmentation({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                    },
                });

                this.selfieSegmentation.setOptions({
                    modelSelection: 1, // 0 = general, 1 = landscape
                });

                // Store segmentation results
                this.latestSegmentation = null;
                this.selfieSegmentation.onResults((results) => {
                    this.latestSegmentation = results;
                });
            }

            // Always create a new Camera instance when starting
            this.camera = new Camera(oVideo, {
                onFrame: async () => {
                    await this.selfieSegmentation.send({ image: oVideo });
                },
                width: 640,
                height: 480,
            });
            this.camera.start();
        },

        _StopCamera: function () {
            if (this.camera) {
                this.camera.stop();
                this.camera = null;
            }
            if (this._cameraStream) {
                this._cameraStream.getTracks().forEach((track) => track.stop());
                this._cameraStream = null;
            }
            var oVideo = document.getElementById("video");
            if (oVideo) {
                oVideo.srcObject = null;
            }
        },

        onTakePhoto: function () {
            if (!this.oCameraDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.ui.com.project1.fragment.SelfieCam",
                    controller: this,
                }).then(
                    function (oDialog) {
                        this.oCameraDialog = oDialog;
                        this.getView().addDependent(this.oCameraDialog);
                        this.oCameraDialog.attachAfterOpen(this._StartCamera.bind(this));
                        this.oCameraDialog.attachAfterClose(this._StopCamera.bind(this));
                        this.oCameraDialog.open();
                    }.bind(this)
                );
            } else {
                this.oCameraDialog.open();
            }
        },

        IC_onCapturePress: function () {
            var oVideo = document.getElementById("video");

            if (!oVideo || !this.latestSegmentation) return;

            const oCanvas = document.createElement("canvas");
            const oContext = oCanvas.getContext("2d");

            oCanvas.width = oVideo.videoWidth;
            oCanvas.height = oVideo.videoHeight;

            oContext.fillStyle = "white";
            oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

            oContext.drawImage(oVideo, 0, 0, oCanvas.width, oCanvas.height);

            const mask = this.latestSegmentation.segmentationMask;
            oContext.globalCompositeOperation = "destination-in";
            oContext.drawImage(mask, 0, 0, oCanvas.width, oCanvas.height);
            oContext.globalCompositeOperation = "destination-over";
            oContext.fillStyle = "white";
            oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);
            oContext.globalCompositeOperation = "source-over";

            var base64Image = oCanvas.toDataURL("image/png");
            var mimeType = "image/png";
            var imageName = "captured_image.png";

            // remove base64 prefix
            var rawBase64 = base64Image.replace(`data:${mimeType};base64,`, "");

            var oModel = this._oProfileDialog.getModel("profileData");
            oModel.setProperty("/fileName", imageName);
            oModel.setProperty("/fileType", mimeType);
            oModel.setProperty("/fileContent", rawBase64);

            // Add this to update UI avatar
            oModel.setProperty("/photo", base64Image);

            // Upload to backend
            this.updateUserPhoto({
                fileName: imageName,
                fileType: mimeType,
                fileContent: rawBase64
            });

            this._StopCamera();
            this.oCameraDialog.close();
        },

        IC_onPressCloseCameraDialog: function () {
            this._StopCamera();
            if (this.oCameraDialog) {
                this.oCameraDialog.close();
            }
        },

        onUploadPhoto: function () {
            const uploader = this.byId("id_fileUploaderAvatar");
            if (!uploader) return;

            setTimeout(() => {
                const oInput = uploader.getFocusDomRef();
                if (!oInput) {
                    console.error("Uploader input not ready");
                    return;
                }
                uploader.clear();
                uploader.setValue("");
                oInput.value = "";
                oInput.accept = "image/*";
                oInput.capture = "";   // remove camera request → gallery
                oInput.click();
            }, 200);
        },

        onAvatarFileSelected: function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (!file) return;
            const MAX_SIZE = 2 * 1024 * 1024; // 2MB
            if (file.size > MAX_SIZE) {
                sap.m.MessageToast.show(
                    "File size must be less than 2 MB.\nSelected file size: " +
                    (file.size / 1024 / 1024).toFixed(2) + " MB"
                );

                // reset uploader field
                oEvent.getSource().clear();
                return;
            }
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fullDataURL = e.target.result;
                const base64 = fullDataURL.split(",")[1]; // remove prefix

                const oModel = this._oProfileDialog.getModel("profileData");
                oModel.setProperty("/photo", fullDataURL);
                await this.updateUserPhoto({
                    fileName: file.name,
                    fileType: file.type,
                    fileContent: base64
                });
            };
            reader.readAsDataURL(file);
        },

        onRemovePhoto: async function () {
            const oModel = this._oProfileDialog.getModel("profileData");
            const initials = oModel.getProperty("/initials");

            oModel.setProperty("/photo", "");
            oModel.setProperty("/initials", initials);
            await this.updateUserPhoto({
                fileName: "",
                fileType: "",
                fileContent: ""
            });
        },

        updateUserPhoto: async function ({ fileName, fileType, fileContent }) {
            try {
                const sUserID = this._oLoggedInUser?.UserID;
                // if (!sUserID) {
                //     sap.m.MessageToast.show(this.i18nModel.getText("usernotLoggedin"));
                //     return;
                // }
                const payload = {
                    data: {
                        FileName: fileName,
                        FileType: fileType,
                        FileContent: fileContent
                    },
                    filters: { UserID: sUserID }
                };
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                this._oLoggedInUser.FileContent = fileContent;
                this._oLoggedInUser.Photo = "data:image/png;base64," + fileContent;

                if (!fileContent) {
                    sap.m.MessageToast.show(this.i18nModel.getText("profilephotoremovedsuccessfully"));
                } else {
                    sap.m.MessageToast.show(this.i18nModel.getText("profilephotoupdatedsuccessfully"));
                }

            } catch (err) {
                console.error(err);
                sap.m.MessageToast.show(this.i18nModel.getText("failedtoUpdateProfilePhoto"));
            }
        },

        onPreviewProfilePhoto: function () {
            const sPhoto = this._oProfileDialog.getModel("profileData").getProperty("/photo");
            if (!sPhoto) {
                sap.m.MessageToast.show(this.i18nModel.getText("noProfilePhotoAvailable"));
                return;
            }
            if (!this._oPreviewDialog) {
                this._oPreviewDialog = new sap.m.Dialog({
                    title: "Profile Photo",
                    contentWidth: "300px",
                    contentHeight: "300px",
                    verticalScrolling: true,
                    content: new sap.m.Image({
                        id: "previewProfileImage",
                        width: "300px",
                        height: "300px",
                        src: ""
                    }),
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: () => this._oPreviewDialog.close()
                    })
                });
                this.getView().addDependent(this._oPreviewDialog);
            }
            sap.ui.getCore().byId("previewProfileImage").setSrc(sPhoto);
            this._oPreviewDialog.open();
        },

        onSigninPasswordLive: function (oEvent) {
            utils._LCvalidatePassword(oEvent.getSource());
        },

        onSignIn: async function () {
            const vm = this.getView().getModel("LoginViewModel");
            // const isOTP = vm.getProperty("/isOtpSelected");
            const isOTP = vm.getProperty("/loginMode") === "otp";


            const oLoginModel = this.getView().getModel("LoginModel");

            const sUserid = sap.ui.getCore().byId("signInuserid").getValue().trim();
            const sUsername = sap.ui.getCore().byId("signInusername").getValue().trim();
            const sPassword = sap.ui.getCore().byId("signinPassword").getValue().trim();
            const sOTP = sap.ui.getCore().byId("signInOTP").getValue().trim();

            // Common mandatory fields
            if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInuserid"), "ID") ||
                !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInusername"), "ID")) {
                sap.m.MessageToast.show(this.i18nModel.getText("entervalidUserIDName"));
                return;
            }

            try {
                sap.ui.core.BusyIndicator.show(0);

                let payload, oResponse;

                // ----------------------------- OTP MODE -----------------------------
                if (isOTP) {

                    const vm = this.getView().getModel("LoginViewModel");
                    const showOTPField = vm.getProperty("/showOTPField");
                    const isOtpEntered = vm.getProperty("/isOtpEntered");

                    const otpCtrl = sap.ui.getCore().byId("signInOTP");

                    // 1️⃣ OTP has NOT been generated
                    if (!showOTPField) {
                        sap.m.MessageToast.show(this.i18nModel.getText("pleaseGenerateOTPFirst"));
                        return;
                    }

                    // 2️⃣ OTP was generated but user has not typed anything
                    if (!isOtpEntered) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
                        sap.m.MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                        return;
                    }

                    // 3️⃣ Validate OTP format strictly
                    if (!/^\d{6}$/.test(sOTP)) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                        sap.m.MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                        return;
                    }

                    // 4️⃣ Backend verification
                    const isValid = await this._verifyOTPWithBackend(sOTP);
                    if (!isValid) {
                        sap.m.MessageToast.show(this.i18nModel.getText("incorrectOTP"));
                        return;
                    }

                    // 5️⃣ Construct payload and continue login
                    payload = { UserID: sUserid, UserName: sUsername, OTP: sOTP };
                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                }
                else {
                    // -------------------------- PASSWORD MODE -------------------------
                    const passCtrl = sap.ui.getCore().byId("signinPassword");

                    // Required
                    if (!sPassword) {
                        passCtrl.setValueState("Error");
                        passCtrl.setValueStateText(this.i18nModel.getText("passwordRequired"));
                        sap.m.MessageToast.show(this.i18nModel.getText("passwordRequired"));
                        return;
                    }

                    // Format validation
                    if (!utils._LCvalidatePassword(passCtrl)) {
                        passCtrl.setValueState("Error");
                        passCtrl.setValueStateText(this.i18nModel.getText("enterValidPassword"));
                        sap.m.MessageToast.show(this.i18nModel.getText("enterValidPassword"));
                        return;
                    }

                    // If valid
                    passCtrl.setValueState("None");

                    if (!utils._LCvalidatePassword(sap.ui.getCore().byId("signinPassword"))) {
                        sap.m.MessageToast.show(this.i18nModel.getText("entervalidpassword"));
                        return;
                    }

                    payload = {
                        UserID: sUserid,
                        UserName: sUsername,
                        Password: btoa(sPassword)
                    };

                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);

                }

                // ---------------------------- HANDLE RESPONSE ----------------------------
                const user = oResponse?.data?.[0];
                // if (!user?.UserID) {
                // 💡 FIX: Enforce case-sensitive username check for password login
                if (!user?.UserID || (!isOTP && user.UserName !== sUsername)) {
                    if (!isOTP && user?.UserID) {
                        // This case happens if backend returns a user but the case doesn't match
                        console.warn("Login failed: Username case mismatch.");
                    }
                    sap.m.MessageToast.show(this.i18nModel.getText("invalidCredentials"));
                    return;
                }

                // sap.m.MessageToast.show("Login Successful!");

                // Global access + Model update
                this._oLoggedInUser = user;
                oLoginModel.setProperty("/EmployeeID", user.UserID);
                oLoginModel.setProperty("/Salutation", user.Salutation);
                oLoginModel.setProperty("/EmployeeName", user.UserName);
                oLoginModel.setProperty("/EmailID", user.EmailID);
                oLoginModel.setProperty("/Role", user.Role);
                oLoginModel.setProperty("/BranchCode", user.BranchCode || "");
                oLoginModel.setProperty("/STDCode", user.STDCode || "");
                oLoginModel.setProperty("/MobileNo", user.MobileNo || "");
                oLoginModel.setProperty("/Gender", user.Gender || "");
                oLoginModel.setProperty("/Country", user.Country || "");
                oLoginModel.setProperty("/State", user.State || "");
                oLoginModel.setProperty("/City", user.City || "");
                oLoginModel.setProperty("/Address", user.Address || "");
                oLoginModel.setProperty("/DateofBirth", this.Formatter.DateFormat(user.DateOfBirth) || "");

                // Role Based Access
                if (user.Role === "Customer") {
                    const oUserModel = new sap.ui.model.json.JSONModel(user);
                    sap.ui.getCore().setModel(oUserModel, "LoginModel");
                    this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", true);
                } else {
                    this.getOwnerComponent().getRouter().navTo("TilePage");
                }

                // Reset login fields
                sap.ui.getCore().byId("signInusername").setValue("");
                sap.ui.getCore().byId("signinPassword").setValue("");
                sap.ui.getCore().byId("signInOTP").setValue("");

                // Close dialog
                if (this._oSignDialog) {
                    this._oSignDialog.close();
                }

            } catch (err) {
                sap.m.MessageToast.show(err.message || "Invalid credentials, Please try again");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onDateChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateDate(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onCountrySelectionChange: function (oEvent) {
            const oCountry = oEvent.getSource();
            const oModel = this._oProfileDialog.getModel("profileData");

            utils._LCvalidateMandatoryField(oEvent);

            const oStateCB = this.byId("id_state");
            const oCityCB = this.byId("id_city");
            const oSTD = this.byId("id_std");
            const oMobile = this.byId("id_phone");

            // Clear value state
            oCountry.setValueState("None");

            /* ---------------- Reset Model ---------------- */
            ["State", "City", "STDCode", "phone"].forEach(p =>
                oModel.setProperty("/" + p, "")
            );

            /* ---------------- Reset UI ---------------- */
            oStateCB?.setSelectedKey("");
            oCityCB?.setSelectedKey("");
            oCityCB?.setValue("");
            oSTD?.setValue("");
            oMobile?.setValue("");

            oStateCB?.getBinding("items")?.filter([]);
            oCityCB?.getBinding("items")?.filter([]);

            const oItem = oCountry.getSelectedItem();
            if (!oItem) {
                oModel.setProperty("/Country", "");
                return;
            }

            const sCountryName = oItem.getText();
            const sCountryCode = oItem.getAdditionalText()?.trim();

            oModel.setProperty("/Country", sCountryName);

            /* ---------------- STD Handling (Same as MC_onChangeCountry) ---------------- */
            const aCountries = this.getOwnerComponent()
                .getModel("CountryModel")
                .getData();

            const oCountryData = aCountries.find(c => c.countryName === sCountryName);

            if (oCountryData?.stdCode) {
                oModel.setProperty("/STDCode", oCountryData.stdCode);
                oSTD.setValue(oCountryData.stdCode);

                this._onProfileSTDChange(); // ⬅ same behavior
            }

            /* ---------------- Filter States ---------------- */
            if (sCountryCode) {
                oStateCB?.getBinding("items")?.filter([
                    new sap.ui.model.Filter(
                        "countryCode",
                        sap.ui.model.FilterOperator.EQ,
                        sCountryCode
                    )
                ]);
            }
        },

        _onProfileSTDChange: function () {
            const oSTD = this.byId("id_std");
            const oMobile = this.byId("id_phone");

            const std = oSTD.getValue();
            oMobile.setValue("");

            // Dynamic mobile length
            if (std === "+91") {
                oMobile.setMaxLength(10);
            } else {
                oMobile.setMaxLength(18);
            }
        },

        MPonMobileLivechnage: function (oEvent) {
            const oInput = oEvent.getSource();

            // Digits only
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            const stdRaw = this.byId("id_std").getValue() || "";
            const std = stdRaw.replace(/\s+/g, "").startsWith("+") ?
                stdRaw.replace(/\s+/g, "") :
                "+" + stdRaw.replace(/\s+/g, "");

            // Untouched empty field → no error
            if (val.length === 0) {
                oInput.setValueState("None");
                return;
            }

            if (!std) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("selectISDCodeFirst"));
                return;
            }

            const isValid = utils._LCvalidateISDmobile(oInput, std);

            if (!isValid) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("mobileNoValueState"));
            } else {
                oInput.setValueState("None");
            }
        },

        CC_onChangeState: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);

            const oModel = this._oProfileDialog.getModel("profileData");
            const oItem = oEvent.getSource().getSelectedItem();

            const oCityCB = this.byId("id_city");
            const oCountryCB = this.byId("id_country");

            // Clear value state on state
            oEvent.getSource().setValueState("None");

            // Reset city-related things
            oModel.setProperty("/City", "");
            // if you have a separate city property:
            // oModel.setProperty("/city", "");

            oCityCB?.setSelectedKey("");
            oCityCB?.setValue("");
            oCityCB?.getBinding("items")?.filter([]);

            // No state selected → clear state in model and exit
            if (!oItem) {
                oModel.setProperty("/State", "");
                return;
            }

            const sStateName = oItem.getKey(); // or getText(), depending on your binding
            const sCountryCode = oCountryCB.getSelectedItem()?.getAdditionalText();

            // Save state in model
            oModel.setProperty("/State", sStateName);

            // Filter cities by state + country
            oCityCB?.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },

        CC_onChangeCity: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);

            const oModel = this._oProfileDialog.getModel("profileData");
            const oItem = oEvent.getSource().getSelectedItem();

            // Clear value state on city
            oEvent.getSource().setValueState("None");

            if (!oItem) {
                oModel.setProperty("/City", "");
                // oModel.setProperty("/city", "");
                return;
            }

            const sCityName = oItem.getKey(); // or getText(), as per your binding

            // Save in model
            oModel.setProperty("/City", sCityName);
            // If you also track explicit city:
            // oModel.setProperty("/city", sCityName);
        },

        onValidateUser: async function () {
            const isValid =
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("fpUserId"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("fpUserName"), "ID");

            if (!isValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                return;
            }

            const oIdCtrl = sap.ui.getCore().byId("fpUserId");
            const oNameCtrl = sap.ui.getCore().byId("fpUserName");

            const sUserId = oIdCtrl.getValue().trim();
            const sUserName = oNameCtrl.getValue().trim();

            const payload = {
                UserID: sUserId,
                UserName: sUserName,
                Type: "OTP"
            };

            sap.ui.core.BusyIndicator.show(0);

            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);

                if (oResp?.success) {
                    sap.m.MessageToast.show(this.i18nModel.getText("oTPSentCheckyourEmail"));
                    // alert(oResp.OTP);

                    this._oResetUser = { UserID: sUserId, UserName: sUserName };
                    // ✅ Start resend cooldown
                    this._startOtpCooldown(20);


                    this.getView().getModel("LoginViewModel").setProperty("/forgotStep", 2);
                } else {
                    sap.m.MessageToast.show(this.i18nModel.getText("noUserFoundwithGivenIDName"));
                }

            } catch (err) {
                sap.m.MessageToast.show("Record not found\nPlease check your\nUser ID / User Name");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _startOtpTimer: function () {
            const vm = this.getView().getModel("LoginViewModel");
            this._clearOtpTimer();
            const START = 20;

            vm.setProperty("/canResendOTP", false);
            vm.setProperty("/otpTimer", START);

            // 🔥 UPDATE TEXT IMMEDIATELY (important)
            vm.setProperty("/otpButtonText", `Resend OTP (${START}s)`);

            this._otpInterval = setInterval(() => {

                let remaining = vm.getProperty("/otpTimer");

                remaining--;

                if (remaining <= 0) {
                    this._clearOtpTimer();
                    vm.setProperty("/otpTimer", 0);
                    vm.setProperty("/otpButtonText", "Resend OTP");
                    vm.setProperty("/canResendOTP", true);
                    return;
                }

                vm.setProperty("/otpTimer", remaining);
                vm.setProperty("/otpButtonText", `Resend OTP (${remaining}s)`);

            }, 1000);
        },

        _clearOtpTimer: function () {
            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }
        },

        _resetOtpState: function () {
            const vm = this.getView().getModel("LoginViewModel");

            this._clearOtpTimer();

            vm.setProperty("/otpTimer", 0);
            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/otpButtonText", "Send OTP");
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            const otpCtrl = sap.ui.getCore().byId("signInOTP");
            otpCtrl?.setValue("");
            otpCtrl?.setEnabled(false);
            otpCtrl?.setValueState("None");
            clearInterval(this._otpInterval);
            this._otpInterval = null;

            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/otpTimer", 0);
            vm.setProperty("/otpButtonText", "Send OTP");
        },

        _startOtpCooldown: function (iSeconds = 20) {
            const vm = this.getView().getModel("LoginViewModel");
            let remaining = iSeconds;

            vm.setProperty("/canResendOTP", false);
            vm.setProperty("/otpButtonText", `Resend OTP in ${remaining}s`);

            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }

            this._otpInterval = setInterval(() => {

                remaining--;

                if (remaining <= 0) {
                    clearInterval(this._otpInterval);
                    this._otpInterval = null;

                    vm.setProperty("/canResendOTP", true);
                    vm.setProperty("/otpButtonText", "Resend OTP");
                    return;
                }

                vm.setProperty("/otpButtonText", `Resend OTP in ${remaining}s`);

            }, 1000);
        },

        _resetOtpCooldown: function () {
            const vm = this.getView().getModel("LoginViewModel");

            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }

            vm.setProperty("/otpButtonText", "Send OTP");
            vm.setProperty("/canResendOTP", false);
        },

        onGlobalSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("newValue")?.toLowerCase() || "";

            const oProfileModel = this._oProfileDialog.getModel("profileData");
            const sSelectedTab = oProfileModel.getProperty("/selectedTab");

            // Decide Table
            const oTable = sSelectedTab === "Payment" ? this.byId("Id_PaymentTable") : this.byId("Id_ProfileaTable");
            const oBinding = oTable.getBinding("items");

            // Apply filters for booking or payment table
            let aFilters = [];
            if (sQuery) {
                if (sSelectedTab === "Payment") {
                    aFilters = [
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("BookingID", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("InvNo", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("InvoiceDate", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("CustomerName", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("TotalAmount", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("DueAmount", sap.ui.model.FilterOperator.Contains, sQuery.toString())
                            ],
                            and: false
                        })
                    ];
                } else {
                    aFilters = [
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("customerName", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("BookingID", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("BookingDate", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("room", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("amount", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("currency", sap.ui.model.FilterOperator.Contains, sQuery.toString())
                            ],
                            and: false
                        })
                    ];
                }
            }
            oBinding.filter(aFilters);
            this._updateRowCount();
        },

        onTableSelect: async function (oEvent) {
            const sKey = oEvent.getParameter("key");
            const oModel = this._oProfileDialog.getModel("profileData");
            oModel.setProperty("/selectedTab", sKey);
        },

        onTableUpdateFinished: function () {
            this._updateRowCount();
        },


        _updateRowCount: function () {
            const oProfileModel = this._oProfileDialog.getModel("profileData");
            const sSelectedTab = oProfileModel.getProperty("/selectedTab");
            const oTable = sSelectedTab === "Payment" ? this.byId("Id_PaymentTable") : this.byId("Id_ProfileaTable");
            const oBinding = oTable.getBinding("items");
            const length = oBinding ? oBinding.getLength() : 0;

            if (sSelectedTab === "Payment") {
                oProfileModel.setProperty("/paymentCount", length);
            } else {
                oProfileModel.setProperty("/bookingCount", length);
            }
        },

        onAdminSIGNUP: function () {
            if (!this._oAdminSignup) {
                this._oAdminSignup = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.AdminSignup",
                    this
                );
                this.getView().addDependent(this._oAdminSignup);

                // 🔒 MAKE DOB READ-ONLY (calendar-only)
                this._FragmentDatePickersReadOnly(["adminDOB"]);

                // 🔐 CACHE ORIGINAL DOC TYPES (ONCE)
                const oDocType = sap.ui.getCore().byId("adminDocType");
                this._adminDocTypeBackup = oDocType.getItems().map(i => ({
                    key: i.getKey(),
                    text: i.getText()
                }));

                this._oAdminSignup.attachAfterClose(() => {
                    this.getView().removeStyleClass("blur-background");
                    this._resetAdminSignupForm();
                });

            }
            // Set DOB limits
            const oDate = sap.ui.getCore().byId("adminDOB");
            if (oDate) {
                const now = new Date();
                oDate.setMaxDate(new Date(now.getFullYear() - 18, now.getMonth(), now.getDate()));
                oDate.setMinDate(new Date(now.getFullYear() - 70, now.getMonth(), now.getDate()));
            }
            this.getView().addStyleClass("blur-background");
            this._oAdminSignup.open();
        },

        onCloseAdminSignup: function () {
            if (this._oAdminSignup) {
                this._resetAdminSignupForm();
                this._oAdminSignup.close();
            }
        },


        ADMIN_onChangeCountry: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;

            const oCountry = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            const oStateModel = this.getView().getModel("StateModel");
            const oCityModel = this.getView().getModel("CityModel");

            const oState = sap.ui.getCore().byId("adminsignUpState");
            const oCity = sap.ui.getCore().byId("adminsignUpCity");
            const oSTD = sap.ui.getCore().byId("adminsignUpSTD");
            const oMobile = sap.ui.getCore().byId("adminMobileNo");

            // --- 1) SANITIZE TYPED COUNTRY TEXT ---
            const val = oCountry.getValue().replace(/[^a-zA-Z\s]/g, "");
            oCountry.setValue(val);

            if (oCountry.getSelectedItem() &&
                val !== oCountry.getSelectedItem().getText()) {
                oCountry.setSelectedKey(null);
                oCountry.setSelectionItem(null);
            }

            // --- 2) RESET dependent model properties ---
            oModel.setProperty("/State", "");
            oModel.setProperty("/City", "");
            oModel.setProperty("/STDCode", "");

            oState.setValue("").setSelectedKey("");
            oCity.setValue("").setSelectedKey("");
            oSTD.setValue("").setSelectedKey("");
            oMobile.setValue("");

            oStateModel.setProperty("/filtered", []);
            oCityModel.setProperty("/filtered", []);

            const selected = oCountry.getSelectedItem();
            oCountry.setValueState("None");

            // CASE B — MANUAL COUNTRY TYPED
            if (!selected) {
                oModel.setProperty("/Country", val);
                return;
            }

            // CASE A — COUNTRY SELECTED
            oModel.setProperty("/Country", selected.getText());

            oState.setValueState("None");
            oCity.setValueState("None");
            oSTD.setValueState("None");
            oMobile.setValueState("None");

            const sCountryCode = selected.getAdditionalText().trim();

            // Mobile length rule
            oMobile.setMaxLength(sCountryCode === "IN" ? 10 : 18);

            // Filter states
            const allStates = oStateModel.getData();
            const filteredStates = allStates.filter(s => s.countryCode === sCountryCode);
            oStateModel.setProperty("/filtered", filteredStates);

            //  AUTO-SELECT STD WITHOUT FILTERING LIST
            let matchedKey = null;
            oSTD.getItems().some(item => {
                if (item.getAdditionalText().trim() === sCountryCode) {
                    matchedKey = item.getKey();
                    return true;
                }
                return false;
            });

            if (matchedKey) {
                oSTD.setSelectedKey(matchedKey);
                oModel.setProperty("/STDCode", matchedKey);
            } else {
                oSTD.setSelectedKey("");
                oModel.setProperty("/STDCode", "");
            }

            // If no states exist → empty city list
            if (filteredStates.length === 0) {
                oCityModel.setProperty("/filtered", []);
            }
        },


        ADMIN_onChangeState: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;

            const oState = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            const oCountry = sap.ui.getCore().byId("adminsignUpCountry");
            const oCity = sap.ui.getCore().byId("adminsignUpCity");
            const oCityModel = this.getView().getModel("CityModel");

            // --- SANITIZE INPUT ---
            const val = oState.getValue().replace(/[^a-zA-Z\s]/g, "");
            oState.setValue(val);

            // Clear state error always (typed or selected)
            oState.setValueState("None");

            // Clear city (dependent)
            oModel.setProperty("/City", "");
            oCity.setSelectedKey("").setValue("");
            oCityModel.setProperty("/filtered", []);

            // Detect manual typing: break auto-selection
            if (oState.getSelectedItem() &&
                val !== oState.getSelectedItem().getText()) {

                oState.setSelectedKey(null);
                oState.setSelectionItem(null);
            }

            const selected = oState.getSelectedItem();
            const selectedCountry = oCountry.getSelectedItem();


            if (!selected || !selectedCountry) {
                oModel.setProperty("/State", val);
                return;
            }

            const sStateText = selected.getText();
            oModel.setProperty("/State", sStateText);

            const sCountryCode = selectedCountry.getAdditionalText().trim();

            // Filter cities
            const allCities = oCityModel.getData();
            const filteredCities = allCities.filter(c =>
                c.countryCode === sCountryCode &&
                c.stateName === sStateText
            );

            oCityModel.setProperty("/filtered", filteredCities);
        },

        ADMIN_onChangeCity: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;

            const oCityCtrl = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            // --- SANITIZE INPUT ---
            const val = oCityCtrl.getValue().replace(/[^a-zA-Z\s]/g, "");
            oCityCtrl.setValue(val);

            // City clears its own error ALWAYS (typed or selected)
            oCityCtrl.setValueState("None");

            const selected = oCityCtrl.getSelectedItem();

            if (selected) {
                oModel.setProperty("/City", selected.getText());
                return;
            }

            oModel.setProperty("/City", val);
        },

        ADMIN_onChangeSTD: function (oEvent) {
            const oSTD = oEvent.getSource();
            const sValue = (oSTD.getValue() || "").trim();
            const oMobile = sap.ui.getCore().byId("adminMobileNo");
            const oModel = this.getView().getModel("AdminSignupModel");

            // Mandatory check
            if (!utils._LCvalidateMandatoryField(oEvent)) {
                return;
            }

            // ✅ + followed by digits, but NOT +0 / +09 / +01
            const STD_REGEX = /^\+[1-9][0-9]*$/;

            if (!STD_REGEX.test(sValue)) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("STD must start with + and contain only numbers (no leading zero)");
                oModel.setProperty("/STDCode", "");
                return;
            }

            // Clean state
            oSTD.setValueState("None");

            // Reset mobile on STD change
            oMobile.setValue("");

            // Length logic
            oMobile.setMaxLength(sValue === "+91" ? 10 : 18);

            // Update model
            oModel.setProperty("/STDCode", sValue);
        },

        ADMIN_onMobileLiveChange: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;
            const oInput = oEvent.getSource();
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            const oSTD = sap.ui.getCore().byId("adminsignUpSTD");
            const stdRaw = oSTD?.getValue() || "";
            const std = stdRaw.startsWith("+") ? stdRaw : "+" + stdRaw;

            if (!val) {
                oInput.setValueState("None");
                return;
            }

            if (!std || std === "+") {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("selectISDCodeFirst"));
                return;
            }

            const valid = utils._LCvalidateISDmobile(oInput, std);

            oInput.setValueState(valid ? "None" : "Error");
            if (!valid) {
                oInput.setValueStateText(this.i18nModel.getText("mobileNoValueState"));
            }
        },

        onAdminLiveValidate: function (oEvent) {
            const id = oEvent.getSource().getId();

            // Vendor name
            if (id.includes("adminVendorName")) {
                utils._LCvalidateName(oEvent);
                return;
            }
            // Email
            if (id.includes("adminEmail")) {
                utils._LCvalidateEmail(oEvent);
                return;
            }

            // Address
            if (id.includes("adminAddress")) {
                utils._LCvalidateMandatoryField(oEvent);
                return;
            }
        },

        ADMIN_onChangeDOB: function (oEvent) {
            const oDatePicker = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            const value = oDatePicker.getValue();  // formatted date (dd/MM/yyyy)
            const raw = oDatePicker.getDateValue(); // JS Date object or null

            // If no valid date selected
            if (!raw) {
                oDatePicker.setValueState("Error");
                // valueStateText comes from XML
                return;
            }

            // Calculate age
            const today = new Date();
            const birth = new Date(raw);
            let age = today.getFullYear() - birth.getFullYear();

            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }

            // Validate range
            if (age < 18 || age > 70) {
                oDatePicker.setValueState("Error");
                // XML valueStateText handles the message
                return;
            }

            // All good → clear error
            oDatePicker.setValueState("None");

            // Save to model in yyyy-MM-dd format for payload
            oModel.setProperty("/DOB", oDatePicker.getValue());
         },

        onSubmitAdminSignup: async function () {
            if (!this._validateAdminSignupFields()) return;

            const oModel = this.getView().getModel("AdminSignupModel");
            const data = oModel.getData();
            const oAdmin = data;

            const payload = {
                data: {
                    Salutation: oAdmin.Salutation,
                    UserName: oAdmin.VendorName,
                    DateOfBirth: oAdmin.DOB,
                    Gender: oAdmin.Gender,
                    EmailID: oAdmin.Email,
                    Country: oAdmin.Country,
                    State: oAdmin.State,
                    City: oAdmin.City,
                    STDCode: oAdmin.STDCode,
                    MobileNo: oAdmin.Mobile,
                    Address: oAdmin.Address,
                    Role: "Admin",
                    Type: "Vendor",
                    Status: "New",
                    Documents: data.Documents.map(doc => ({
                        FileName: doc.FileName,
                        DocumentType: doc.VdocType,
                        FileType: doc.DocumentType,
                        File: doc.File
                    }))
                }
            };
            sap.ui.core.BusyIndicator.show(0);

            try {
                await this.ajaxCreateWithJQuery("HM_Login", payload);

                sap.m.MessageBox.success(
                    "Thank you for signing up.\n\n" +
                    "Our team will review your details and documents. You will receive an email with your User ID and User Name once the verification is complete.\n\n" +
                    "Please check your inbox (and spam folder) for further updates.",
                    {
                        title: "Registration Submitted Successfully",
                        contentWidth: "500px", // Try adding this directly here
                        // styleClass: "myCustomMessageBoxSize",
                        emphasizedAction: sap.m.MessageBox.Action.OK,
                        onClose: () => {
                            this._oAdminSignup.close();
                        }
                    }
                );

            } catch (err) {
                sap.m.MessageToast.show(this.i18nModel.getText("registrationFailed"));
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onAdminFileSelect: function (oEvent) {
            const oUploader = sap.ui.getCore().byId("adminFileUploader");
            const oDocType = sap.ui.getCore().byId("adminDocType");
            const oModel = this.getView().getModel("AdminSignupModel");

            const file = oEvent.getParameter("files")?.[0];
            if (!file) return;

            const MAX_SIZE = 2 * 1024 * 1024; // 5 MB
            if (file.size > MAX_SIZE) {
                sap.m.MessageToast.show(this.i18nModel.getText("filesizemustnotexceed5MB"));
                oUploader.clear();
                return;
            }

            const selectedDocType = oDocType.getSelectedKey();

            // 🔒 Guard 1: Doc type mandatory
            if (!selectedDocType) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectDocumentTypeFirst"));
                oUploader.clear();
                return;
            }

            // 🔒 Guard 2: Duplicate file check
            if (this._isDuplicateFile(file.name)) {
                sap.m.MessageToast.show(this.i18nModel.getText("thisfilealreadyuploaded"));
                oUploader.clear();
                return;
            }

            // 🔒 Lock controls during processing
            oModel.setProperty("/UploadEnabled", false);
            oModel.setProperty("/DocTypeEnabled", false);

            const reader = new FileReader();

            reader.onload = () => {
                const base64 = reader.result.split(",")[1];
                const docs = oModel.getProperty("/Documents") || [];

                // 🔑 ADDITION: preview URL for images ONLY
                const previewUrl = file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : null;

                docs.push({
                    FileName: file.name,
                    DocumentType: file.type,      // MIME
                    VdocType: selectedDocType,    // Aadhaar / PAN etc
                    File: base64,
                    Base64: base64,
                    PreviewUrl: previewUrl,       // 🔥 NEW (for preview)
                    size: file.size
                });

                oModel.setProperty("/Documents", docs);
                // ✅ CLEAR ERROR STATE HERE (this is what you asked)
                const table = sap.ui.getCore().byId("adminAttachmentTable");
                table?.removeStyleClass("fileErrorHighlight");

                // 🔥 Remove used document type from ComboBox
                oDocType.getItems().forEach(i => {
                    if (i.getKey() === selectedDocType) {
                        oDocType.removeItem(i);
                    }
                });

                // 🔁 Reset doc type
                oModel.setProperty("/CurrentDocType", "");
                oUploader.clear();

                // 🔓 Re-enable ONLY if options remain
                const hasMoreTypes = oDocType.getItems().length > 0;
                oModel.setProperty("/DocTypeEnabled", hasMoreTypes);
                oModel.setProperty("/UploadEnabled", false);

                if (!hasMoreTypes) {
                    sap.m.MessageToast.show(this.i18nModel.getText("alldocumentsuploaded"));
                }
            };

            reader.readAsDataURL(file);
        },

        ADMIN_onChangeGender: function (oEvent) {
            const oSelect = oEvent.getSource();
            const key = oSelect.getSelectedKey();

            this.getView().getModel("AdminSignupModel")
                .setProperty("/Gender", key);

            oSelect.setValueState(key ? "None" : "Error");
        },

        _resetAdminSignupForm: function () {
            const C = sap.ui.getCore().byId.bind(sap.ui.getCore());
            const oModel = this.getView().getModel("AdminSignupModel");

            // -------- MODEL RESET (SAFE WAY) --------
            [
                "/Salutation",
                "/VendorName",
                "/DOB",
                "/Gender",
                "/Email",
                "/Country",
                "/State",
                "/City",
                "/STDCode",
                "/Mobile",
                "/Address",
                "/CurrentDocType"
            ].forEach(p => oModel.setProperty(p, ""));

            oModel.setProperty("/Documents", []);

            // -------- FORCE TABLE REFRESH --------
            const oTable = C("adminAttachmentTable");
            oTable?.getBinding("items")?.refresh(true);
            oTable?.removeStyleClass("fileErrorHighlight");

            // -------- RESET CONTROLS (IMPORTANT ORDER) --------
            [
                "adminSalutation",
                "adminVendorName",
                "adminDOB",
                "adminGender",
                "adminEmail",
                "adminsignUpCountry",
                "adminsignUpState",
                "adminsignUpCity",
                "adminsignUpSTD",
                "adminMobileNo",
                "adminAddress",
                "adminDocType"
            ].forEach(id => {
                const c = C(id);
                if (!c) return;

                // ComboBox / Select
                c.setSelectedKey?.("");
                c.setValue?.("");

                // Inputs / DatePicker
                c.setValueState?.("None");
            });

            // -------- RESTORE DOCUMENT TYPE DROPDOWN --------
            const oDocType = sap.ui.getCore().byId("adminDocType");

            if (oDocType && this._adminDocTypeBackup) {
                oDocType.removeAllItems();

                this._adminDocTypeBackup.forEach(d => {
                    oDocType.addItem(
                        new sap.ui.core.ListItem({
                            key: d.key,
                            text: d.text
                        })
                    );
                });
            }

            // Reset flags
            oModel.setProperty("/CurrentDocType", "");
            oModel.setProperty("/DocTypeEnabled", true);

        },

        _validateAdminSignupFields: function () {
            const C = sap.ui.getCore().byId.bind(sap.ui.getCore());
            const M = this.getView().getModel("AdminSignupModel");
            const std = (C("adminsignUpSTD").getValue() || "").trim();

            // Pick actual UI5 controls
            const oName = C("adminVendorName");
            const oDOB = C("adminDOB");
            const oGender = C("adminGender");
            const oEmail = C("adminEmail");
            const oCountry = C("adminsignUpCountry");
            const oState = C("adminsignUpState");
            const oCity = C("adminsignUpCity");
            const oSTD = C("adminsignUpSTD");
            const oMobile = C("adminMobileNo");
            const oAddress = C("adminAddress");

            const isValid =
                utils._LCstrictValidationSelect(sap.ui.getCore().byId("adminSalutation"))
                &&
                utils._LCvalidateName(oName, "ID") &&
                utils._LCvalidateMandatoryField(oDOB, "ID") &&
                utils._LCstrictValidationSelect(oGender) &&

                utils._LCvalidateEmail(oEmail, "ID") &&

                utils._LCvalidateMandatoryField(oCountry, "ID") &&
                utils._LCvalidateMandatoryField(oState, "ID") &&
                utils._LCvalidateMandatoryField(oCity, "ID") &&
                utils._LCvalidateMandatoryField(oSTD, "ID") &&

                utils._LCvalidateISDmobile(oMobile, std) &&
                utils._LCvalidateAddress(oAddress);

            if (!isValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("MSfillallfields"));
                return false;
            }

            const docs = M.getProperty("/Documents");

            if (!docs || docs.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseuploadatleastonedocument"));

                const table = C("adminAttachmentTable");
                table?.addStyleClass("fileErrorHighlight");

                return false;
            }

            return true;
        },

        _initAdminSignupModel: function () {
            const oModel = new sap.ui.model.json.JSONModel({
                Salutation: "",
                VendorName: "",
                DOB: "",
                Gender: "",
                Email: "",
                Country: "",
                State: "",
                City: "",
                STDCode: "",
                Mobile: "",
                Address: "",
                CurrentDocType: "",
                Documents: [],

                // 🔥 NEW CONTROL FLAGS
                UploadEnabled: false,
                DocTypeEnabled: true
            });

            this.getView().setModel(oModel, "AdminSignupModel");
        },

        onAdminDocTypeChange: function (oEvent) {
            const oModel = this.getView().getModel("AdminSignupModel");
            const key = oEvent.getSource().getSelectedKey();

            oModel.setProperty("/UploadEnabled", !!key);
        },

        _isDuplicateFile: function (fileName) {
            const docs = this.getView()
                .getModel("AdminSignupModel")
                .getProperty("/Documents") || [];

            return docs.some(d => d.FileName === fileName);
        },

        _onCollectAdminSignupPayloadDocs: function () {
            const oModel = this.getView().getModel("AdminSignupModel");
            const aDocs = oModel.getProperty("/Documents") || [];

            const aPayloadDocs = aDocs.map(d => ({
                FileName: d.FileName,
                DocumentType: d.DocumentType,
                FileType: d.FileType,
                Base64: d.Base64
            }));

            return aPayloadDocs;
        },

        onAdminDeleteDoc: function (oEvent) {
            const oModel = this.getView().getModel("AdminSignupModel");
            const oDocType = sap.ui.getCore().byId("adminDocType");
            const table = sap.ui.getCore().byId("adminAttachmentTable");
            const oCtx = oEvent.getParameter("listItem").getBindingContext("AdminSignupModel");
            const doc = oCtx.getObject(); // ✅ define first

            // 🧹 Cleanup preview blob
            if (doc.PreviewUrl) {
                URL.revokeObjectURL(doc.PreviewUrl);
            }

            const index = parseInt(oCtx.getPath().split("/").pop(), 10);
            const docs = oModel.getProperty("/Documents") || [];

            docs.splice(index, 1);
            oModel.setProperty("/Documents", docs);

            // ♻️ Restore doc type option
            oDocType.addItem(new sap.ui.core.ListItem({
                key: doc.VdocType,
                text: doc.VdocType
            }));

            oModel.setProperty("/DocTypeEnabled", true);

            // 🔴 If no documents left → show error highlight
            if (docs.length === 0) {
                table?.addStyleClass("fileErrorHighlight");
            }
        },

        onAdminDocTypeSelected: function () {
            const uploader = sap.ui.getCore().byId("hiddenAdminUploader");

            if (uploader && uploader.openFileDialog) {
                uploader.openFileDialog();   // <--- THIS opens Browse dialog
            }
        },

        onAdminPreviewDoc: function (oEvent) {
            const oDoc = oEvent.getSource().getBindingContext("AdminSignupModel").getObject();

            if (!oDoc.PreviewUrl) {
                sap.m.MessageToast.show(this.i18nModel.getText("previewunavailable"));
                return;
            }

            if (!this._previewDialog) {
                this._previewDialog = new sap.m.Dialog({
                    title: "",
                    contentWidth: "70%",
                    contentHeight: "70%",
                    resizable: true,
                    draggable: true,
                    verticalScrolling: false,   // 🔑 IMPORTANT
                    horizontalScrolling: false, // 🔑 IMPORTANT
                    content: [
                        new sap.m.Image({
                            width: "100%",
                            height: "100%",
                            densityAware: false
                        }).addStyleClass("adminPreviewImage")
                    ],
                    endButton: new sap.m.Button({
                        text: "Close",
                        press: () => this._previewDialog.close()
                    })
                }).addStyleClass("adminPreviewDialog");

                this.getView().addDependent(this._previewDialog);
            }

            this._previewDialog.setTitle(oDoc.FileName);
            this._previewDialog.getContent()[0].setSrc(oDoc.PreviewUrl);
            this._previewDialog.open();
        },

        _openReadOnlyDoc: function (oDoc) {
            sap.m.MessageBox.information(
                "Preview not available for this document type.\n\nFile: " + oDoc.FileName,
                { title: "Read-Only Document" }
            );
        },

        onClosePreview: function () {
            this._previewDialog.close();
        },

        onAdminChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();

            const oGender = sap.ui.getCore().byId("adminGender");

            // 🔥 Clear salutation error immediately
            oSalutation.setValueState("None");

            if (!oGender) return;

            // Reset gender first
            oGender.setSelectedKey("");
            oGender.setEnabled(true);

            // Auto-map gender
            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            }
            else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }
            // Dr. → manual gender selection

            // ✅ Strict validation (CONTROL, not event)
            utils._LCstrictValidationSelect(oSalutation);
        },

        MPonAddressChange: function (oEvent) {
            utils._LCvalidateAddress(oEvent.getSource());
        },
        onNameInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateName(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },
        
        // MP_onChangeDOB: function (oEvent) {
        //     utils._LCvalidateDate(oEvent);
        // },
    });
});