sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], function (BaseController, JSONModel, MessageToast, MessageBox, utils, Formatter, Filter, FilterOperator) {
    "use strict";
    const $C = (id) => sap.ui.getCore().byId(id);
    // const $V = (id) => $C(id)?.getValue()?.trim() || "";
    this._otpResendInterval = null;
    this._otpValidityInterval = null;
    return BaseController.extend("sap.ui.com.project1.controller.Hostel", {
        _isProfileRequested: false,
        Formatter: Formatter,
        onInit: function () {
            this.getView().setModel(new JSONModel({
                showGlobalFooter: false,
                showRoomsFooter: false,
            }), "FooterModel");
            this.getOwnerComponent().getRouter().getRoute("RouteHostel").attachMatched(this._onRouteMatched, this);
            this._getBrowserLocation();
            this._initAdminSignupModel();

            const today = new Date();
            const focusedDate = new Date(2000, 0, 1);
            const minDate = new Date(2000, 0, 1);

            const oDateModel = new JSONModel({
                focusedDate: focusedDate,
                minDate: minDate,
                maxDate: today
            });

            this.getView().setModel(oDateModel, "controller");
        },
      
        _getBrowserLocation: function () {
            if (!navigator.geolocation) return MessageToast.show(this.i18nModel.getText("geolocationnotsupported"));

            // Options for better reliability
            const options = {
                enableHighAccuracy: true, // trying to use GPS
                timeout: 10000, // 10 secs wait 
                maximumAge: 0 // Fresh location, every time
            };

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    let lat = pos.coords.latitude;
                    let lng = pos.coords.longitude;
                    this._getLocationName(lat, lng);
                },
                (err) => {
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            break;
                        case err.POSITION_UNAVAILABLE:
                            break;
                        case err.TIMEOUT:
                            break;
                        default:
                    }
                },
                options
            );
        },

        _getLocationName: function (lat, lng) {
            // Debounce: clear previous timer
            if (this._geoTimeout) {
                clearTimeout(this._geoTimeout);
            }
            // Call API after 1.2 seconds
            this._geoTimeout = setTimeout(async () => {
                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

                    const response = await fetch(url, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "User-Agent": "SAP-UI5-App-Hostel-App"
                        }
                    });

                    if (!response.ok) {
                        throw new Error("HTTP Error: " + response.status);
                    }

                    const data = await response.json();

                    if (data && data.address) {
                        this.City = data.address.city || data.address.town || data.address.village || "";
                        this.State = data.address.state || "";
                        this.Country = data.address.country || "";
                        this.CountryCode = data.address.country_code?.toUpperCase() || "";

                        console.log("Location found:", this.City, this.State, this.Country);
                    }

                } catch (error) { }
            }, 1200); // 1 request per second (safe for Nominatim)
        },

        _onRouteMatched: async function () {
            const sStoredTab = sessionStorage.getItem("homePageReturnTab") || "idHome";
            const oTabHeader = this.byId("mainTabHeader");
            if (oTabHeader) oTabHeader.setSelectedKey(sStoredTab);

            const oNavContainer = this.byId("pageContainer");
            if (oNavContainer) {
                const oPage = this.byId(sStoredTab);
                if (oPage) oNavContainer.to(oPage);
            }
            sessionStorage.removeItem("homePageReturnTab");

            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.iTop = 5; // records per load
            this.iSkip = 0; // starting index

            this.flag = false
            this.roomtype = false

            if (!this.getView().getModel("VisibilityModel")) {
                this.getView().setModel(new JSONModel({ NoData: false, ShowViewMore: false }), "VisibilityModel");
            }
            const oView = this.getView();
            //  Disable controls initially
            this.byId("id_Branch").setEnabled(true);
            this.byId("id_Area").setEnabled(true);
            this.byId("id_Roomtype").setEnabled(true);

            //  Create all static local models
            oView.setModel(new JSONModel({ CustomerName: "", MobileNo: "", Gender: "", DateOfBirth: "", CustomerEmail: "", RoomType: "" }), "HostelModel");
            this.oHostelModel = oView.getModel("HostelModel");

            oView.setModel(new JSONModel({ isEditMode: false }), "saveModel");
            // oView.setModel(new JSONModel({ isOtpSelected: false, isPasswordSelected: true }), "LoginViewModel");
            oView.setModel(new JSONModel({
                isOtpSelected: false,
                isPasswordSelected: true,
                authFlow: "signin",
                isOtpBoxVisible: false,
                otpExpiryTs: null,
                otpValidityText: "",
                isOTPAllowed: true

            }), "LoginViewModel");

            this.oViewModel = oView.getModel("LoginViewModel");

            // Add only your required properties (safe, isolated)
            this.oViewModel.setProperty("/loginMode", "password"); // "password" or "otp"
            this.oViewModel.setProperty("/showOTPField", false); // show OTP input box only after Send OTP success
            this.oViewModel.setProperty("/isOtpEntered", false); // enable Sign In only when OTP entered

            oView.setModel(new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: "",
                minDate: new Date(2000, 0, 1)
            }), "LoginMode");
            oView.setModel(new JSONModel({
                selectedSection: "profile"
            }), "profileSectionModel");

            this.oViewModel.setProperty("/showOTPField", false);

            const oState = $C("signUpState");
            const oCity = $C("signUpCity");

            if (oState?.getBinding("items")) {
                oState.getBinding("items").filter([
                    new Filter("stateName", "EQ", "__NONE__")
                ]);
            }

            if (oCity?.getBinding("items")) {
                oCity.getBinding("items").filter([
                    new Filter("cityName", "EQ", "__NONE__")
                ]);
            }
            this.oViewModel.setProperty("/canResendOTP", true);
            this.oViewModel.setProperty("/otpTimer", 0);
            this.oViewModel.setProperty("/otpButtonText", "Send OTP");

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
            var model = new JSONModel({
                IssueName: "",
                IssueDescription: "",
                RaisedBy: "",
                Email: ""
            });
            this.getView().setModel(model, "SupportModel")

            const oUploaderData = new JSONModel({
                attachments: []
            });
            this.getView().setModel(oUploaderData, "UploaderData");
            this.getView().setModel(
                new JSONModel({
                    tokens: []
                }),
                "tokenModel"
            );

            // -----------------------------
// HANDLE POST LOGIN REDIRECTION
// -----------------------------
// const sRedirectFlag = sessionStorage.getItem("redirectAfterLogin");

// if (sRedirectFlag === "bookingFlow") {

//     // Clear flag
//     sessionStorage.removeItem("redirectAfterLogin");

//     // Restore booking data
//     const sData = sessionStorage.getItem("pendingBookingData");
//     if (sData) {
//         const oData = JSON.parse(sData);

//         let oGlobalModel = sap.ui.getCore().getModel("HostelModel");
//         if (!oGlobalModel) {
//             oGlobalModel = new JSONModel({});
//             sap.ui.getCore().setModel(oGlobalModel, "HostelModel");
//         }

//         oGlobalModel.setData(oData, true);

//         // Also restore local model if needed
//         if (this.oHostelModel) {
//             this.oHostelModel.setData(oData, true);
//         }
//         sessionStorage.removeItem("pendingBookingData");
//     }

//     // Reopen room detail fragment automatically
//     setTimeout(() => {
//         this._reopenRoomDetailAfterLogin();
//     }, 300);
// }
         this.onAfterAnimate()
        },
          onAfterAnimate: function () {

    var oHome = this.byId("idHome");

    var aImages = [
        sap.ui.require.toUrl("sap/ui/com/project1/image/BedHostel.png"),
        sap.ui.require.toUrl("sap/ui/com/project1/image/Home2.jpg"),
        sap.ui.require.toUrl("sap/ui/com/project1/image/Home3.jpg"),
        sap.ui.require.toUrl("sap/ui/com/project1/image/Home4.jpg"),
        sap.ui.require.toUrl("sap/ui/com/project1/image/Home5.jpg")
    ];

    var iIndex = 0;

    // Initial Image
    oHome.$().css("background-image", "url('" + aImages[0] + "')");

    this._imageInterval = setInterval(function () {

        // Fade Out
        oHome.$().addClass("fadeOut");

        setTimeout(function () {

            iIndex = (iIndex + 1) % aImages.length;

            oHome.$().css(
                "background-image",
                "url('" + aImages[iIndex] + "')"
            );

            // Fade In
            oHome.$()
                .removeClass("fadeOut")
                .addClass("fadeIn");

        }, 1000);

    }, 5000);
},


        _reopenRoomDetailAfterLogin: function () {

    if (!this._oRoomDetailFragment) {
        this._oRoomDetailFragment = sap.ui.xmlfragment(
            "sap.ui.com.project1.fragment.SignInSignup",
            this
        );
        this.getView().addDependent(this._oRoomDetailFragment);
    }
    this._oRoomDetailFragment.open();
},

        _clearOtpValidityTimer: function () {
            if (this._otpValidityInterval) {
                clearInterval(this._otpValidityInterval);
                this._otpValidityInterval = null;
            }
        },
        /**/
        _startOtpValidity: function () {
            const vm = this.oViewModel;

            const expiryTs = Date.now() + (10 * 60 * 1000); //1000xx

            vm.setProperty("/otpExpiryTs", expiryTs);

            this._clearOtpValidityTimer();

            this._otpValidityInterval = setInterval(() => {
                const remainingMs = expiryTs - Date.now();

                if (remainingMs <= 0) {
                    this._onOtpExpired();
                    return;
                }

                const totalSec = Math.floor(remainingMs / 1000); //1000xx
                const min = Math.floor(totalSec / 60);
                const sec = totalSec % 60;

                vm.setProperty(
                    "/otpValidityText",
                    `OTP expires in ${min}:${sec.toString().padStart(2, "0")}`
                );
            }, 1000);
        },

        _onOtpExpired: function () {
            const vm = this.oViewModel;

            this._clearOtpValidityTimer();
            this._clearOtpResendTimer();

            vm.setProperty("/otpExpiryTs", null);
            vm.setProperty("/otpValidityText", "OTP expired");
            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            if (vm.getProperty("/authFlow") === "forgot") {
                vm.setProperty("/forgotStep", 1);
            }

            const otpCtrl =
                vm.getProperty("/authFlow") === "forgot" ?
                    $C("fpOTP") :
                    $C("signInOTP");

            otpCtrl?.setValue("");
            otpCtrl?.setEnabled(false);
            otpCtrl?.setValueState("None");

            MessageToast.show("OTP expired. Please resend OTP.");
        },

        onUserlivechange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                id_Branch: new Set(),
            };

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
            const oModel = this.oHostelModel;
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
            const oUIModel = this.getOwnerComponent().getModel("UIModel");
            const bLoggedIn = oUIModel?.getProperty("/isLoggedIn");
         
            if (!bLoggedIn) {
                MessageBox.information("Please log in to continue booking.", {
                    title: "Login Required",
                    styleClass: "myUnifiedBtn",
                    actions: [MessageBox.Action.OK],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function () {
                        this.onpressLogin();
                        sessionStorage.setItem("homePageReturnTab", "idRooms");
                    }.bind(this)
                });

                return;
            }
            const oView = this.getView();
            const oLocalModel = this.oHostelModel;
            const oData = oLocalModel?.getData?.() || {};

            // -------------------------
            // BASIC VALIDATIONS
            // -------------------------
            if (!oData.Visible) {
                MessageToast.show(this.i18nModel.getText("thisroomcurrentlyoccupiedPleaseselectanotherroom"));
                return;
            }

            if (!oData.SelectedPriceType || !oData.SelectedPriceValue) {
                MessageToast.show(this.i18nModel.getText("pleaseselectpricingplanbeforebooking"));
                return;
            }

            // -------------------------
            // GET / CREATE GLOBAL MODEL
            // -------------------------
            let oGlobalModel = sap.ui.getCore().getModel("HostelModel");
            if (!oGlobalModel) {
                oGlobalModel = new JSONModel({});
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
                PropertyType: oData.PropertyType || "Hostel",
                Capacity: parseInt(oData.Capacity, 10) || 1,
                Address: oData.Address || "",
                Area: oData.Area || "",
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
                YearPrice: oData.YearPrice,
                CheckInTime: oData.CheckInTime,
                CheckOutTime: oData.CheckOutTime,
                Deposit: oData.Deposit,
                DepositCurrency: oData.DepositCurrency,
                GSTValue: oData.GSTValue,
                GSTType: oData.GSTType,
                GSTIN: oData.GSTIN || "",


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
                MessageToast.show(this.i18nModel.getText("nobedsavailableforbooking"));
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

            // Clear carousel pages instead of destroying them - use Fragment.byId for O(1) lookup
            const oCarousel = sap.ui.core.Fragment.byId("roomDetailsFrag", "roomImageCarousel");
            if (oCarousel) oCarousel.destroyPages();

            // Refresh integration card instead of destroying it - need to know card ID
            // Fallback to findAggregatedObjects for integration card since we don't know its ID
            const oCard = oFrag.findAggregatedObjects(true, obj => obj.isA && obj.isA("sap.ui.integration.widgets.Card"))[0];
            if (oCard && oCard.refresh) {
                oCard.refresh();
            }

            // Clear model data instead of destroying models
            ["HostelModel", "FacilityModel"].forEach(name => {
                const m = oFrag.getModel(name);
                if (m) m.setData({});
            });

            // Close the fragment but keep it in memory for reuse
            oFrag.close();

            // Clear any carousel interval
            if (this._carouselInterval) {
                clearInterval(this._carouselInterval);
                this._carouselInterval = null;
            }

            // NOTE: Fragment is NOT destroyed, NOT removed as dependent, and NOT set to null
            // This allows it to be reused instantly next time viewDetails is called
        },

        _bindCarousel: function () {
            // Use Fragment.byId for O(1) lookup instead of O(n) findAggregatedObjects
            const oCarousel = sap.ui.core.Fragment.byId("roomDetailsFrag", "roomImageCarousel");

            if (!oCarousel) {
                // Fallback to findAggregatedObjects for backward compatibility
                const fallbackCarousel = this._oRoomDetailFragment
                    .findAggregatedObjects(true,
                        obj => obj.isA && obj.isA("sap.m.Carousel")
                    )[0];
                if (!fallbackCarousel) return;
                return; // Use the fallback - but we should have found it via Fragment.byId
            }

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

            // ---------- AUTO SCROLL using native SAP UI5 Carousel properties ----------
            const imgs =
                this._oRoomDetailFragment
                    ?.getModel("HostelModel")
                    ?.getProperty("/ImageList") || [];

            if (imgs.length > 1) {
                // Set native auto-play properties
                oCarousel.setAutoPlay(true);
                oCarousel.setAutoPlayDelay(3000);

                // Pause on user interaction using native event handling
                const PAUSE_FOR_10_SECONDS = () => {
                    oCarousel.setAutoPlay(false);

                    // Resume after 10 seconds
                    if (this._carouselResumeTimeout) {
                        clearTimeout(this._carouselResumeTimeout);
                    }

                    this._carouselResumeTimeout = setTimeout(() => {
                        if (oCarousel && !oCarousel.bIsDestroyed && imgs.length > 1) {
                            oCarousel.setAutoPlay(true);
                        }
                    }, 10000);
                };

                // Attach events for user interaction
                oCarousel.attachBrowserEvent("touchstart", PAUSE_FOR_10_SECONDS);
                oCarousel.attachBrowserEvent("mousedown", PAUSE_FOR_10_SECONDS);
                oCarousel.attachBrowserEvent("click", PAUSE_FOR_10_SECONDS);
            }

            // Clear any existing interval (for backward compatibility)
            if (this._carouselInterval) {
                clearInterval(this._carouselInterval);
                this._carouselInterval = null;
            }
        },

        _convertFacilities: function (list) {
            const defaultImages = {
                "High-Speed Wi-Fi": "../image/High-Speed Wi-Fi.jpg",
                "Laundry Service": "../image/Laundry Service.jpg",
                "Ironing Service": "../image/Ironing Service.jpg",
                "Housekeeping": "../image/Housekeeping.jpg",
                "Meals / Food Subscription": "../image/Meals.jpg",
                "Gym Membership": "../image/gym.jpg",
                "Two-Wheeler Parking": "../image/Two-Wheeler Parking.webp",
                "Four-Wheeler Parking": "../image/Two-Wheeler Parking.webp",
                "Locker / Storage Facility": "../image/locker.jpg",
                "Power Backup": "../image/Power Backup.jpeg",
                "Air Conditioner": "../image/Air Conditioner.jpeg",
                "Room Heater": "../image/Room Heater.jpeg",
                "Study Room Access": "../image/Study Room.png",
                "Others": "../image/defaultFacility.png"
            };

            return list
                .map(f => {

                    // Price logic
                    let price = 0;
                    let unit = "";
                    const bHasUnitPrice = parseFloat(f.UnitPrice) > 0;

                    if (bHasUnitPrice) {
                        price = f.UnitPrice;
                        unit = "Unit Price";
                    } else if (parseFloat(f.PerHourPrice) > 0) {
                        price = f.PerHourPrice;
                        unit = "Per Hour";
                    } else if (parseFloat(f.PerDayPrice) > 0) {
                        price = f.PerDayPrice;
                        unit = "Per Day";
                    } else if (parseFloat(f.PerMonthPrice) > 0) {
                        price = f.PerMonthPrice;
                        unit = "Per Month";
                    } else if (parseFloat(f.PerYearPrice) > 0) {
                        price = f.PerYearPrice;
                        unit = "Per Year";
                    } else {
                        return null;
                    }

                    const hasImage = !!(f.Photo1 && f.Photo1.trim());
                    const name = (f.Type || f.FacilityName || "").trim();

                    return {
                        FacilityID: f.ID,
                        FacilityName: f.FacilityName || name,
                        Price: price,
                        UnitText: unit,
                        Currency: f.Currency || "INR",

                        Image: hasImage ?
                            `data:${f.Photo1Type || "image/jpeg"};base64,${f.Photo1}` : defaultImages[name] || "../image/defaultFacility.png"
                    };
                })
                .filter(Boolean); // remove null
        },
        _LoadFacilities: async function (sBranchCode) {

            if (!this._oRoomDetailFragment || !sBranchCode) return;

            const oFacilityModel = new JSONModel({
                loading: true,
                Facilities: [],
                BranchCode: sBranchCode
            });
            this._oRoomDetailFragment.setModel(oFacilityModel, "FacilityModel");

            try {
                let resp = await this.ajaxReadWithJQuery("HM_Facilities", { BranchCode: sBranchCode });
                let allFacilities = resp?.data || [];

                // Get static types
                const oStaticModel = this.getView().getModel("FacilityType");
                const staticTypes = oStaticModel ? oStaticModel.getData() : [];
                const validTypesLower = staticTypes.map(t => (t.FacilityName || ""));

                // Case-insensitive filter for type only (branch already filtered by backend)
                const branchFacilities = allFacilities.filter(f => {
                    const fNameLower = (f.Type || "").trim();
                    const typeMatch = validTypesLower.includes(fNameLower);

                    return typeMatch;
                });

                if (branchFacilities.length > 0) {
                    oFacilityModel.setProperty("/Facilities", this._convertFacilities(branchFacilities));
                } else {
                    oFacilityModel.setProperty("/Facilities", []);
                }
            } catch (err) {
                console.error("❌ Facility load error:", err);
            }
            oFacilityModel.setProperty("/loading", false);
        },


        viewDetails: function (oEvent) {
            try {
                const oView = this.getView();
                const oSelected = oEvent.getSource().getBindingContext("VisibilityModel").getObject();
                const sBranchCode = oSelected.BranchCode || "";
                const oFullDetails = {
                    RoomNo: oSelected.RoomNo || "",
                    BedType: oSelected.Name || "",
                    Address: oSelected.Address || "",
                    Area: oSelected.Images?.[0]?.Area, // hostel's name
                    ACType: oSelected.ACType || "AC",
                    Description: oSelected.Description || "No description available",
                    Price: oSelected.Price || "N/A",
                    MonthPrice: oSelected.MonthPrice || "N/A",
                    YearPrice: oSelected.YearPrice || "N/A",
                    Currency: oSelected.Currency || "INR",
                    Address: oSelected.Address || "",
                    BranchCode: sBranchCode,
                    Capacity: oSelected.NoOfPerson || "",
                    ImageList: (oSelected.Images || []).map(img => img.src),
                    SelectedPriceType: "",
                    SelectedPriceValue: "",
                    Country: oSelected.Country,
                    Visible: oSelected.Visible,
                    AvailbleBeds: oSelected.AvailbleBeds,
                    CheckInTime: oSelected.CheckInTime,
                    CheckOutTime: oSelected.CheckOutTime,
                    Deposit: oSelected.Deposit,
                    DepositCurrency: oSelected.DepositCurrency,
                    GSTType: oSelected.GSTType,
                    GSTValue: oSelected.GSTValue,
                    GSTIN: oSelected.GSTIN || "",
                    GeoLocation: oSelected.GeoLocation,


                };

                const oHostelModel = new JSONModel(oFullDetails);
                oView.setModel(oHostelModel, "HostelModel");
                this.oHostelModel = oHostelModel;

                oView.setModel(new JSONModel({
                    loading: true,
                    Facilities: []
                }), "FacilityModel");

                // Helper function to load data in parallel
                const loadDataInParallel = () => {
                    // Load facilities and amenities in parallel
                    Promise.all([
                        this._LoadFacilities(sBranchCode),
                        this._LoadAmenities(sBranchCode)
                    ]).catch(err => {
                        console.error("Error loading facilities/amenities in parallel:", err);
                    });
                };

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
                        loadDataInParallel();
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

                // Load facilities and amenities in parallel
                loadDataInParallel();
                this._updateBookTileState();

            } catch (err) {
                console.log(" viewDetails error:", err);
            }
        },
        _updateBookTileState: function () {

            const oTile =
                sap.ui.core.Fragment.byId("roomDetailsFrag", "bookTile");

            if (!oTile) return;

            const bOccupied = !this.oHostelModel.getProperty("/Visible");

            if (bOccupied) {
                oTile.addStyleClass("occupied");
            } else {
                oTile.removeStyleClass("occupied");
            }
        },


        _LoadAmenities: async function (sBranchCode) {
            const oAmenityModel = new JSONModel({
                loading: true,
                Amenities: [],
                BranchCode: sBranchCode // Store for reference
            });
            this._oRoomDetailFragment.setModel(oAmenityModel, "AmenityModel");

            try {
                let resp = await this.ajaxReadWithJQuery("HM_HostelFeatures", { BranchCode: sBranchCode });
                let allList = resp?.data || [];

                // Filter: Type in static amenities (branch already filtered by backend)
                const oStaticModel = this._oRoomDetailFragment.getModel("AmenitiType");
                const staticTypes = oStaticModel ? oStaticModel.getData() : [];
                const validTypes = staticTypes.map(t => t.AmenitiName.toLowerCase());

                const branchAmenities = allList.filter(x =>
                    validTypes.includes((x.Type || "").toLowerCase()) // Match Type/AmenityType
                );



                if (branchAmenities.length > 0) {
                    oAmenityModel.setProperty("/Amenities", this._convertAmenities(branchAmenities));
                } else {

                    oAmenityModel.setProperty("/Amenities", []);
                }
            } catch (err) {
                console.log("❌ Amenity load error:", err);
            }
            oAmenityModel.setProperty("/loading", false);
        },

        _convertAmenities: function (list) {
            const defaultImages = {
                "Wi-Fi": "../image/High-Speed Wi-Fi.jpg",
                "CCTV Surveillance": "../image/CCTV Surveillance.jpeg",
                "Drinking Water": "../image/Drinking Water.jpg",
                "Geyser": "../image/Geyser.jpeg",
                "Ceiling Fan": "../image/Ceiling Fan.jpg",
                "Washing Machine": "../image/Washing Machine.jpg",
                "Wardrobe": "../image/Wardrobe.jpg",
                "Study Table": "../image/Study Table.jpg",
                "Refrigerator": "../image/Refrigerator.png",
                "Attached Bathroom": "../image/Attached Bathroom.jpg",
                "Parking": "../image/Parking1.jpeg",
                "Lift": "../image/Lift.jpg",
                "Room Cleaning": "../image/Room Cleaning.jpg",
                "Mess Facility": "../image/Mess Facility.jpeg",
                "Kitchen Access": "../image/Kitchen Access.png",
                "Personal Lockers": "../image/locker.jpg",
                "Communal Spaces": "../image/CommonSpace.jpg",
                "Lounge Areas": "../image/LoungeArea.jpg"
            };

            return list.map(item => {
                const amenityType = (item.AmenityType || item.Type || "").trim();
                const hasImage = !!(item.Photo1 && item.Photo1.trim());

                return {
                    ...item,
                    ImageSrc: hasImage ?
                        `data:${item.Photo1Type || "image/jpeg"};base64,${item.Photo1}` : defaultImages[amenityType] || "./images/default.png"
                };
            });
        },

        onRoomDetailOpened: function () {
            // This is called from the fragment's afterOpen event
            // Since we now load amenities in parallel with facilities in viewDetails,
            // this function is kept as a fallback but will check if amenities are already loaded
            if (this._oRoomDetailFragment) {
                const oAmenityModel = this._oRoomDetailFragment.getModel("AmenityModel");
                // If amenities model doesn't exist or is empty, we might need to load them
                // This could happen if viewDetails didn't complete loading for some reason
                if (!oAmenityModel || !oAmenityModel.getProperty("/Amenities") || oAmenityModel.getProperty("/Amenities").length === 0) {
                    const oHostelModel = this._oRoomDetailFragment.getModel("HostelModel");
                    if (oHostelModel) {
                        const sBranchCode = oHostelModel.getProperty("/BranchCode");
                        if (sBranchCode) {
                            this._LoadAmenities(sBranchCode);
                        }
                    }
                }
            }
        },

        onImageLoadError: function (oEvent) {
            const oImage = oEvent.getSource();
            const sFallback = sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png");

            if (!oImage.data("hasFallback")) {
                oImage.data("hasFallback", true);
                setTimeout(() => oImage.setSrc(sFallback), 0); // Agar image load nahi hui, toh fallback set hoga
            }
        },

        onCloseRoomDetail: function () {
            if (this._oRoomDetailFragment) this._oRoomDetailFragment.close();
            this._clearRoomDetailDialog(); // destroy AFTER
        },

        onDialogAfterClose: function () {
            if (this._oRoomDetailFragment) this._oRoomDetailFragment.close(); // close FIRST
            this._clearRoomDetailDialog();
        },

        _navigateTo: function (sKey) {
            const oNav = this.byId("pageContainer");
            const oPage = this.byId(sKey);
            if (!oNav || !oPage) return;

            try {
                oNav.to(oPage, "show");
            } catch (oError) {
                oNav.to(oPage);
            }
        },

        onTabSelect: async function (oEvent) {
            const oView = this.getView();
            const oVisibilityModel = oView.getModel("VisibilityModel");
            oVisibilityModel.setProperty("/Branches", {})
            oVisibilityModel.setProperty("/ShowViewMore", false);

            const sKey = oEvent.getParameter("item").getKey();
            this._navigateTo(sKey);
            const page = this.byId(sKey);
            if (page && page.scrollTo) page.scrollTo(0, 0);

            this.flag = true;
            this.iTop = 5;
            this.iSkip = 0;
            this.roomtype = true;

            const oFooterModel = this.getView().getModel("FooterModel");
            if (sKey === "idRooms") {
                   if (this._imageInterval) {
        clearInterval(this._imageInterval);
                                            }
               
                oFooterModel.setProperty("/showGlobalFooter", false);
                oFooterModel.setProperty("/showRoomsFooter", false);
                

                let oModel = this.getOwnerComponent().getModel("sBRModel");

                if (!oModel) {
                    oModel = new JSONModel([]);
                    this.getOwnerComponent().setModel(oModel, "sBRModel");
                }

                let aData = oModel.getData();
                if (!aData || aData.length === 0) {
                    this.byId("idBedTypeFlex").setBusy(true);
                    this.byId("id_Branch").setBusy(true).setValueState("None");
                    this.byId("id_Area").setBusy(true);
                    this.byId("id_Roomtype").setBusy(true)
                    

                    try {
                        const response = await this.ajaxReadWithJQuery("HM_Branch", "");
                        aData = response?.data || [];
                        oModel.setData(aData);

                        const oBranchCombo = this.byId("id_Branch");
if (aData.length === 0) {
    // Clear input first
    oBranchCombo.setValue("");
    
    // Insert No Data item to dropdown
    if (oBranchCombo.getItems().length === 0) {
        oBranchCombo.insertItem(new sap.ui.core.ListItem({
            key: "",
            text: "No Data"
        }), 0);
    }
} else {
    // Clear any manual No Data items when real data loads
    oBranchCombo.removeAllItems();
}

                        // ✅ Handle No Data
                        if (!aData || aData.length === 0) {
                            oVisibilityModel.setProperty("/NoData", true);
                        } else {
                            oVisibilityModel.setProperty("/NoData", false);
                        }
                    } finally {
                        this.closeBusyDialog();
                    }
                }
                await this._loadRoomsPageData();
            } else {
                oFooterModel.setProperty("/showGlobalFooter", true);
                oFooterModel.setProperty("/showRoomsFooter", false);
            }
            if(sKey === "idContact"){
                if (this._imageInterval) {
        clearInterval(this._imageInterval);
            }
        }

            if (sKey === "idHome") {
                this.onAfterAnimate()
                this._exploreBtnAnimationTimeout = setTimeout(() => {
                    this._animateExploreButton();
                    this._exploreBtnAnimationTimeout = null;
                }, 50);
            }
        },

        _animateExploreButton: function () {
            const oWrapper = this.byId("exploreWrapper");
            if (!oWrapper) return;
            oWrapper.removeStyleClass("explore-enter");

            const oDomRef = oWrapper.getDomRef();
            if (oDomRef) {
                void oDomRef.offsetHeight;
            }
            oWrapper.addStyleClass("explore-enter");
        },

        onExit: function () {
            if (this._exploreBtnAnimationTimeout) {
                clearTimeout(this._exploreBtnAnimationTimeout);
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

        onpressBookrooms: function () {
            const oTabHeader = this.byId("mainTabHeader");
            const oItem = oTabHeader.getItems().find(i => i.getKey() === "idRooms");

            oTabHeader.setSelectedKey("idRooms");
            this.onTabSelect({
                getParameter: () => oItem
            });
        },

        onpressLogin: function () {
            if (!this._oSignDialog) {
                this._oSignDialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.SignInSignup", this);
                this.getView().addDependent(this._oSignDialog);
                this._oSignDialog.addStyleClass("authDialog"); // Add our custom style class
                this._oSignDialog.attachAfterClose(this._resetAuthDialog, this);
            }
            // COMPLETE reset of all auth-related states
            this.oViewModel.setProperty("/authFlow", "signin");
            this.oViewModel.setProperty("/loginMode", "password");
            this.oViewModel.setProperty("/showOTPField", false);
            this.oViewModel.setProperty("/isOtpEntered", false);

            // 🔥 FIX: You forgot these
            this.oViewModel.setProperty("/isOtpSelected", false);
            this.oViewModel.setProperty("/isPasswordSelected", true);

            // Reset fields
            this._resetAllAuthFields?.();
            this._clearAllAuthFields?.();

            // Reset OTP UI
            const otpCtrl = $C("signInOTP");
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }

            const btnSendOTP = $C("btnSignInSendOTP");
            if (btnSendOTP) btnSendOTP.setVisible(false);

            // Reset password valid state
            const passCtrl = $C("signinPassword");
            if (passCtrl) {
                passCtrl.setEnabled(true);
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }

            // Reset dialog title
            this.oViewModel.setProperty("/dialogTitle", "Sign In");
            this.getView().addStyleClass("blur-background");
            this._oSignDialog.open();
        },

      onDialogClose: function () {
    this._resetOtpState();

    if (this._oSignDialog) {
        this.getView().removeStyleClass("blur-background");

        this._oSignDialog.close();   // Close first
        this._oSignDialog.destroy(); // Destroy

        this._oSignDialog = null;    // 🔥 CRITICAL FIX
    }
},

        onSwitchToSignIn: function () {
            this.oViewModel.setProperty("/authFlow", "signin");
            this.oViewModel.setProperty("/loginMode", "password");
            this.oViewModel.setProperty("/forgotStep", 0);
            this.oViewModel.setProperty("/dialogTitle", "Sign In");

            // RESET OTP + TIMER
            this._resetOtpState();

            // RESET SIGN-IN FIELDS
            ["signInEmail", "signinPassword", "signInOTP"]
                .forEach(id => {
                    const c = $C(id);
                    if (c) {
                        c.setValue("");
                        c.setValueState("None");
                        c.setValueStateText("");
                    }
                });

            $C("signinPassword")?.setEnabled(true);
            $C("signInOTP")?.setEnabled(false);
            $C("btnSignInSendOTP")?.setVisible(false);

            // RESET FORGOT FIELDS
            ["fpEmailId", "fpOTP", "newPass", "confPass"]
                .forEach(id => {
                    const c = $C(id);
                    if (c) {
                        c.setValue("");
                        c.setValueState("None");
                        c.setValueStateText("");
                    }
                });

            // 🚫 DISABLE FORGOT FORM
            ["fpEmailId", "fpOTP", "newPass", "confPass"]
                .forEach(id => {
                    const c = $C(id);
                    if (c) c.setEnabled(false);
                });

            // RESET SIGN-UP FIELDS
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

            // Also reset the model for signup
            const oLoginModeModel = this.getView().getModel("LoginMode");
            if (oLoginModeModel) {
                oLoginModeModel.setData({
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
            }

            // PANELS
            $C("signInPanel")?.setVisible(true);
            $C("signUpPanel")?.setVisible(false);

            // HEADER
            $C("authDialog")
                ?.getCustomHeader()
                ?.getContentMiddle()[0]
                ?.setText("Sign In");
        },

        // onSwitchToSignUp: function () {
        //     const oSignInPanel = $C("signInPanel");
        //     const oSignUpPanel = $C("signUpPanel");

        //     // 🔒 MAKE DOB READ-ONLY (calendar-only)
        //     this._FragmentDatePickersReadOnly(["signUpDOB"]);

        //     oSignInPanel?.setVisible(false);
        //     oSignUpPanel?.setVisible(true);

        //     this.oViewModel.setProperty("/authFlow", "signup");
        //     this.oViewModel.setProperty("/dialogTitle", "Hostel Access Portal");

        //     // DOB Limits Logic
        //     const oDOBpicker = $C("signUpDOB");
        //     if (oDOBpicker) {
        //         const oToday = new Date();
        //         const oMaxDate = new Date(oToday.getFullYear() - 10, oToday.getMonth(), oToday.getDate());
        //         oDOBpicker.setMaxDate(oMaxDate);
        //         const oMinDate = new Date(oToday.getFullYear() - 100, oToday.getMonth(), oToday.getDate());
        //         oDOBpicker.setMinDate(oMinDate);
        //     }

        //     // 🔥 AUTO-POPULATE LOCATION DATA
        //     const oLoginModel = this.getView().getModel("LoginMode");
        //     if (this.Country) {
        //         oLoginModel.setProperty("/Country", this.Country);
        //         this.onChangeCountry(null); // Manual trigger (Safe call)

        //         if (this.State) {
        //             // Delay is important for binding filters to react
        //             setTimeout(() => {
        //                 oLoginModel.setProperty("/State", this.State);
        //                 this.onChangeState(null);

        //                 if (this.City) {
        //                     setTimeout(() => {
        //                         oLoginModel.setProperty("/City", this.City);
        //                         this.onChangeCity(null);
        //                     }, 200);
        //                 }
        //             }, 200);
        //         }
        //     }

        //     this._resetOtpState();
        //     this._addPasswordGenerateIcon();
        // },
        onSwitchToSignUp: function () {
            const oSignInPanel = $C("signInPanel");
            const oSignUpPanel = $C("signUpPanel");

            // 🔒 DOB Read-only and Titles
            this._FragmentDatePickersReadOnly(["signUpDOB"]);
            this.oViewModel.setProperty("/authFlow", "signup");
            this.oViewModel.setProperty("/dialogTitle", "Sign Up"); // Added back

            oSignInPanel?.setVisible(false);
            oSignUpPanel?.setVisible(true);

            // DOB Limits Logic
            const oDOBpicker = $C("signUpDOB");
            if (oDOBpicker) {
                const oToday = new Date();
                oDOBpicker.setMaxDate(oToday);
                // oDOBpicker.setMinDate(new Date(2000, 0, 1)); // Jan 1, 2000 as minimum age limit
            }

            // --- AUTO-POPULATE WITH BUSY INDICATOR ---
            const oCountryCB = $C("signUpCountry");
            const oCountryModel = this.getOwnerComponent().getModel("CountryModel");

            const fnRunAutoPopulate = () => {
                const oLoginModel = this.getView().getModel("LoginMode");
                if (this.Country) {
                    oLoginModel.setProperty("/Country", this.Country);
                    this.onChangeCountry(null); // Trigger Country Fuzzy Match & STD Logic

                    if (this.State) {
                        setTimeout(() => {
                            oLoginModel.setProperty("/State", this.State);
                            this.onChangeState(null); // Trigger State Fuzzy Match & City Filter

                            if (this.City) {
                                setTimeout(() => {
                                    oLoginModel.setProperty("/City", this.City);
                                    this.onChangeCity(null); // Trigger City Fuzzy Match
                                }, 300);
                            }
                        }, 300);
                    }
                }
            };

            // Data Availability Check
            if (!oCountryModel || !oCountryModel.getData() || oCountryModel.getData().length === 0) {
                oCountryCB.setBusy(true);
                $C("signUpState").setEnabled(false);
                $C("signUpCity").setEnabled(false);
                $C("signUpSTD").setEnabled(false);
                $C("signUpPhone").setEnabled(false);

                const nInterval = setInterval(() => {
                    const oLatest = this.getOwnerComponent().getModel("CountryModel");
                    if (oLatest && oLatest.getData() && oLatest.getData().length > 0) {
                        clearInterval(nInterval);
                        $C("signUpState").setEnabled(true);
                        $C("signUpCity").setEnabled(true);
                        $C("signUpSTD").setEnabled(true);
                        $C("signUpPhone").setEnabled(true);

                        oCountryCB.setBusy(false);
                        fnRunAutoPopulate();
                    }
                }, 300);
            } else {
                fnRunAutoPopulate();
            }

            // OTP and Password Icons
            this._resetOtpState();
            this._addPasswordGenerateIcon();
        },



        SM_onGeneratePassword: function () {
            var oPwdInput = $C("signUpPassword");
            var oStrength = $C("passwordStrengthText");

            if (!oPwdInput) return;

            var pwd = utils._LCgenerateStrongPassword();
            oPwdInput.setValue(pwd);

            this.getView().getModel("LoginMode").setProperty("/password", pwd);
            utils._LCvalidatePassword(oPwdInput, oStrength);
        },
        _addPasswordGenerateIcon: function () {
            const aInputs = [$C("signUpPassword"), $C("newPass")];

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
            const oInput = oIcon.getParent(); // 👈 actual input owning the icon
            if (!oInput || !oInput.getValue) return;
            const pwd = oInput.getValue();
            if (!pwd) return sap.m.MessageToast.show(this.i18nModel.getText("noPasswordCopy"));

            navigator.clipboard.writeText(pwd)
                .then(() => {
                    MessageToast.show(this.i18nModel.getText("passwordCopied"));
                })
                .catch(() => {
                    try {
                        const oTemp = document.createElement("textarea");
                        oTemp.value = pwd;
                        document.body.appendChild(oTemp);
                        oTemp.select();
                        document.execCommand("copy");
                        document.body.removeChild(oTemp);
                        MessageToast.show(this.i18nModel.getText("passwordCopied"));
                    } catch (err) {
                        MessageToast.show(this.i18nModel.getText("copyFailed"));
                    }
                });
        },

        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        SM_onTogglePasswordVisibility: function (oEvent) {
            var oInput = oEvent.getSource();
            // 1. Capture value BEFORE type change
            var sValue = oInput.getValue();

            // 2. Toggle type
            var bIsPassword = oInput.getType() === "Password";
            oInput.setType(bIsPassword ? "Text" : "Password");

            // 3. Toggle icon
            oInput.setValueHelpIconSrc(bIsPassword ? "sap-icon://hide" : "sap-icon://show");

            // 4. Restore value AFTER re-render
            oInput.setValue(sValue);
        },

        SM_onChnageSetAndConfirm: function (oEvent) {
            const oInput = oEvent.getSource();
            const sId = oInput.getId(); // 🔥 Sabse pehle ID lein
            let val = oInput.getValue();

            // Remove spaces
            if (/\s/.test(val)) {
                val = val.replace(/\s+/g, "");
                oInput.setValue(val);
            }
            if (sId === "signUpPassword" || sId === "newPass") {
                this.getView().getModel("LoginMode").setProperty("/password", val);
            }

            // Strength Label Logic
            let oStrengthText = null;
            if (sId === "signUpPassword") {
                oStrengthText = $C("passwordStrengthText");
            } else if (sId === "newPass") {
                oStrengthText = $C("fpPasswordStrengthText");
            }

            utils._LCvalidatePassword(oInput, oStrengthText);
        },

        SM_onGenerateForgotPassword: function () {
            var oPwdInput = $C("newPass");
            var oStrength = $C("fpPasswordStrengthText");
            if (!oPwdInput) return;

            // ✅ Only generate + validate (NO copying here)
            var pwd = utils._LCgenerateStrongPassword();
            oPwdInput.setValue(pwd);
            this.getView().getModel("LoginMode").setProperty("/password", pwd);
            utils._LCvalidatePassword(oPwdInput, oStrength);
        },

        onSignUp: async function () {
            const C = sap.ui.getCore().byId.bind(sap.ui.getCore());
            const oModel = this.getView().getModel("LoginMode");
            const data = oModel.getData();

            const sCountry = C("signUpCountry").getValue() || data.Country;
            const sState = C("signUpState").getValue() || data.State;
            const sCity = C("signUpCity").getValue() || data.City;
            const sSTD = C("signUpSTD").getValue() || data.STDCode;

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
                utils._LCvalidateISDmobile(C("signUpPhone"), sSTD) &&
                utils._LCvalidateAddress(C("signUpAddress")) &&
                utils._LCvalidatePassword(
                    C("signUpPassword"),
                    $C("passwordStrengthText")
                ) &&
                this.FSM_onConfirm({
                    getSource: () => C("signUpConfirmPassword")
                }));

            if (!isValid) return MessageToast.show(this.i18nModel.getText("MSfillallfields"));
            const TimeDate = new Date().toISOString().replace("T", " ").slice(0, 19);
            const sFinalPassword = $C("signUpPassword").getValue();

            const payload = {
                data: {
                    Salutation: C("signUpSalutation").getSelectedKey() || C("signUpSalutation").getValue(),
                    UserName: (data.fullname || "").trim(),
                    Role: "Customer",
                    Type: "Customer",
                    EmailID: (data.Email || "").trim(),
                    Password: btoa(sFinalPassword),
                    STDCode: sSTD, // Synced value
                    MobileNo: data.Mobileno,
                    Status: "Active",
                    TimeDate,
                    DateOfBirth: data.DateOfBirth || "",
                    Gender: C("signUpGender").getSelectedKey() || C("signUpGender").getValue(),
                    Country: sCountry, // Synced value
                    State: sState, // Synced value
                    City: sCity, // Synced value
                    Address: (data.Address || "").trim()
                }
            };
            this.getBusyDialog();
            try {
                const oResp = await this.ajaxCreateWithJQuery("HM_Login", payload);
                if (!oResp || oResp.success !== true) {
                    const sFailMsg = oResp?.message || this.i18nModel.getText("registrationFailedPleasetryagain");
                    return MessageBox.error(sFailMsg, {
                        title: "Registration Failed",
                        styleClass: "myUnifiedBtn",
                    });
                }

                const sUsername = data.fullname.trim();
                const Salutation = C("signUpSalutation").getSelectedItem().getText();
                const sSuccessMsg = "Thank you " + Salutation + " " + sUsername + ", for registration.\n\n" +
                    "Your account has been created successfully";

                const sPassword = data.password;
                const oCtrl = this; // 👈 REQUIRED
                MessageBox.success(sSuccessMsg, {
                    title: "Success",
                    contentWidth: "500px",
                    styleClass: "myUnifiedBtn",
                    onClose: () => {
                        // ✅ Credentials trigger FIRST
                        oCtrl._triggerBrowserSaveCredentials(sUsername, sPassword);

                        oCtrl.oViewModel.setProperty("/authFlow", "signin");
                        oCtrl.oViewModel.setProperty("/loginMode", "password");
                        oCtrl.oViewModel.setProperty("/showOTPField", false);
                        oCtrl.oViewModel.setProperty("/isOtpEntered", false);
                        oCtrl.oViewModel.setProperty("/dialogTitle", "Sign In");
                        oCtrl.oViewModel.setProperty("/forgotStep", 1);

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

                        $C("signInPanel")?.setVisible(true);
                        $C("signUpPanel")?.setVisible(false);

                        $C("signinPassword")?.setEnabled(true).setValue("");
                        $C("signInOTP")?.setEnabled(false).setValue("");
                        $C("btnSignInSendOTP")?.setVisible(false);
                        $C("signInEmail")?.setValue("");
                        oCtrl.onpressLogin();
                        setTimeout(() => {
                            const sEmail = (data.Email || "").trim();
                            if (sEmail) {
                                $C("signInEmail")?.setValue(sEmail);
                            }
                        }, 100);
                    }
                });
            } catch (err) {
                let sMsg =
                    err?.responseJSON?.message ||
                    (() => {
                        if (typeof err?.responseText === "string") {
                            try {
                                const oErr = JSON.parse(err.responseText);
                                return oErr?.message;
                            } catch (e) { }
                        }
                        return this.i18nModel.getText("registrationFailedPleasetryagain");
                    })();

                MessageBox.error(sMsg, {
                    title: "Registration Failed"
                });
            } finally {
                this.closeBusyDialog();
            }
        },


        _triggerBrowserSaveCredentials: function (username, password) {
            const form = document.createElement("form");
            form.style.display = "none";

            // 2. Username input
            const u = document.createElement("input");
            u.type = "text";
            u.name = "username";
            u.autocomplete = "username";
            u.value = username;

            const p = document.createElement("input");
            p.type = "password";
            p.name = "password";
            p.autocomplete = "current-password";
            p.value = password;

            form.append(u, p);
            document.body.appendChild(form);

            if (window.fetch) {
                fetch(window.location.href, {
                    method: "POST",
                    mode: "no-cors",
                    body: new FormData(form)
                }).catch(() => { });
            }

            // 5. Cleanup
            setTimeout(() => form.remove(), 500);
        },



        // --- Refactored State Change ---
        onChangeState: function (oEvent) {
            const oState = oEvent ? oEvent.getSource() : $C("signUpState");
            const oModel = this.getView().getModel("LoginMode");
            const oCity = $C("signUpCity");
            const oStateModel = this.getOwnerComponent().getModel("StateModel"); // to get all states for fuzzy search

            if (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                oModel.setProperty("/City", "");
                oCity.setValue("").setSelectedKey("");
                oCity.getBinding("items")?.filter([new Filter("cityName", "EQ", "__NONE__")]);
            }

            const sStateSearch = oEvent ? oState.getValue() : oModel.getProperty("/State");
            oModel.setProperty("/State", sStateSearch);

            const oCountry = $C("signUpCountry");
            const sCountryCode = oCountry.getSelectedItem()?.getAdditionalText()?.trim();

            if (!sCountryCode) {
                oCity.getBinding("items").filter([new Filter("cityName", "EQ", "__NONE__")]);
                return;
            }

            // Get all states for the current country to perform fuzzy search
            const allStates = oStateModel.getData() || [];
            const countryStates = allStates.filter(s => s.countryCode === sCountryCode);

            const oMatch = this._findBestMatch(sStateSearch, countryStates, "stateName");

            if (oMatch) {
                oState.setSelectedKey(oMatch.stateName);
                const sStateName = oMatch.stateName;

                // Filter Cities
                oCity.getBinding("items").filter([
                    new Filter("stateName", "EQ", sStateName),
                    new Filter("countryCode", "EQ", sCountryCode)
                ]);
            } else {
                oCity.getBinding("items").filter([new Filter("cityName", "EQ", "__NONE__")]);
            }
        },

        // --- Refactored City Change ---
        onChangeCity: function (oEvent) {
            const oCityCtrl = oEvent ? oEvent.getSource() : $C("signUpCity");
            const oModel = this.getView().getModel("LoginMode");
            const oCityModel = this.getOwnerComponent().getModel("CityModel");

            if (oEvent) utils._LCvalidateMandatoryField(oEvent);

            const sCitySearch = oEvent ? oCityCtrl.getValue() : oModel.getProperty("/City");
            oModel.setProperty("/City", sCitySearch);

            const oState = $C("signUpState");
            const sStateName = oState.getSelectedItem()?.getText() || oState.getValue();
            const oCountry = $C("signUpCountry");
            const sCountryCode = oCountry.getSelectedItem()?.getAdditionalText()?.trim();

            if (!sStateName || !sCountryCode) {
                return;
            }

            const allCities = oCityModel.getData() || [];
            const stateCities = allCities.filter(c => c.stateName === sStateName && c.countryCode === sCountryCode);

            // --- FUZZY LOGIC INTEGRATION ---
            const oMatch = this._findBestMatch(sCitySearch, stateCities, "cityName");

            if (oMatch) {
                oCityCtrl.setSelectedKey(oMatch.cityName);
                oModel.setProperty("/City", oMatch.cityName);
                oCityCtrl.setValueState("None");
            } else {
                // If no match, keep what user typed
                oModel.setProperty("/City", sCitySearch);
            }
        },
        // onChangeState: function (oEvent) {
        //     const oState = oEvent.getSource();
        //     const oModel = this.getView().getModel("LoginMode");

        //     // sanitize free typing
        //     oState.setValue(oState.getValue().replace(/[^a-zA-Z\s]/g, ""));

        //     utils._LCvalidateMandatoryField(oEvent);

        //     // ✅ ALWAYS WRITE TO MODEL
        //     const sStateText =
        //         oState.getSelectedItem()?.getText() ||
        //         oState.getValue() ||
        //         "";

        //     oModel.setProperty("/State", sStateText);

        //     // reset city whenever state changes
        //     const oCity = $C("signUpCity");
        //     oModel.setProperty("/City", "");
        //     oCity.setValue("").setSelectedKey("");

        //     oCity.getBinding("items")?.filter([
        //         new Filter("cityName", "EQ", "__NONE__")
        //     ]);

        //     // release cities only if country is valid
        //     const oCountry = $C("signUpCountry");
        //     const sCountryCode =
        //         oCountry.getSelectedItem()?.getAdditionalText()?.trim();

        //     if (!sCountryCode || !sStateText) return;

        //     oCity.getBinding("items")?.filter([
        //         new Filter("stateName", "EQ", sStateText),
        //         new Filter("countryCode", "EQ", sCountryCode)
        //     ]);
        // },
        // onChangeCity: function (oEvent) {
        //     const oCity = oEvent.getSource();
        //     const oModel = this.getView().getModel("LoginMode");
        //     // sanitize manual typing
        //     oCity.setValue(oCity.getValue().replace(/[^a-zA-Z\s]/g, ""));
        //     const oCountry = $C("signUpCountry");
        //     const oState = $C("signUpState");
        //     const hasCountry = !!oCountry.getSelectedItem();
        //     const hasState = !!oState.getSelectedItem() || !!oState.getValue();
        //     // parent missing → block
        //     if (!hasCountry || !hasState) {
        //         oCity.setValue("");
        //         oCity.setSelectedKey("");
        //         oCity.getBinding("items")?.filter([new Filter("cityName", "EQ", "__NONE__")]);
        //         oCity.setValueState("None");
        //         return;
        //     }
        //     utils._LCvalidateMandatoryField(oEvent);
        //     // ✅ ALWAYS WRITE TO MODEL
        //     const sCityText = oCity.getSelectedItem()?.getText() || oCity.getValue() || "";

        //     oModel.setProperty("/City", sCityText);
        // },

        onChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = $C("signUpGender");
            // Reset gender
            oGender.setSelectedKey("");
            oGender.setEnabled(true);
            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            } else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }
            utils._LCstrictValidationSelect(oSalutation);
        },

        onChangeDOB: function (oEventOrControl) {
            const oDP =
                (typeof oEventOrControl.getSource === "function") ?
                    oEventOrControl.getSource() : oEventOrControl;
            if (!oDP) return false;
            const v = oDP.getDateValue();

            if (!v) {
                oDP.setValueState("Error");
                oDP.setValueStateText(this.i18nModel.getText("dateofBirthisRequired"));
                return false;
            }

            // // Age validation (10–100)
            // const today = new Date();
            // let age = today.getFullYear() - v.getFullYear();
            // const m = today.getMonth() - v.getMonth();

            // if (m < 0 || (m === 0 && today.getDate() < v.getDate())) age--;

            // if (age < 10 || age > 100) {
            //     oDP.setValueState("Error");
            //     oDP.setValueStateText(this.i18nModel.getText("agemustbebetween10and100years"));
            //     return false;
            // }
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
            const oCountry = $C("signUpCountry");
            const oState = $C("signUpState");
            const hasCountry = !!oCountry.getSelectedItem();
            const hasState = !!oState.getSelectedItem();

            // ❗ User typed a value without valid parents → reset
            if (!hasCountry || !hasState) {
                oCity.setValue("");
                oCity.setSelectedKey("");
                oCity.getBinding("items")?.filter([new Filter("cityName", "EQ", "__NONE__")]);
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
            const stdRaw = $C("signUpSTD").getValue() || "";
            const std = stdRaw.replace(/\s+/g, "").startsWith("+") ?
                stdRaw.replace(/\s+/g, "") : "+" + stdRaw.replace(/\s+/g, "");

            // Don't show error for empty untouched field
            if (val.length === 0) return oInput.setValueState("None");

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
                oInput.setValueStateText(std === "+91" ? this.i18nModel.getText("MSmobileNoValueStateIN") : this.i18nModel.getText("MSmobileNoValueStateINT"));
            } else {
                oInput.setValueState("None");
            }
        },

        onAddressChange: function () {
            utils._LCvalidateAddress($C("signUpAddress"))
        },

        // onChangeCountry: function (oEvent) {
        //     const oCountry = oEvent.getSource();
        //     oCountry.setValue(oCountry.getValue().replace(/[^a-zA-Z\s]/g, ""));
        //     if (!utils._LCvalidateMandatoryField(oEvent)) {
        //         return;
        //     }

        //     const oModel = this.getView().getModel("LoginMode");
        //     const oState = $C("signUpState");
        //     const oCity = $C("signUpCity");
        //     const oSTD = $C("signUpSTD");

        //     ["State", "City", "Mobileno", "STDCode"].forEach(p => oModel.setProperty("/" + p, ""));
        //     oState.setSelectedKey("");
        //     oCity.setSelectedKey("");
        //     oSTD.setSelectedKey("");
        //     oState.getBinding("items")?.filter([new Filter("stateName", "EQ", "__NONE__")]);

        //     oCity.getBinding("items")?.filter([new Filter("cityName", "EQ", "__NONE__")]);

        //     const oItem = oCountry.getSelectedItem();
        //     if (!oItem) return;

        //     const sCountryName = oItem.getText();
        //     const sCountryCode = oItem.getAdditionalText()?.trim();

        //     oModel.setProperty("/Country", sCountryName);
        //     const aCountries = this.getOwnerComponent().getModel("CountryModel").getProperty("/");

        //     const oMatch = aCountries?.find(c => c.countryName === sCountryName);

        //     if (oMatch?.stdCode) {
        //         oModel.setProperty("/STDCode", oMatch.stdCode);
        //         oSTD.setSelectedKey(oMatch.stdCode); //  correct
        //         this.onSTDChange();
        //     }

        //     if (sCountryCode) {
        //         oState.getBinding("items")?.filter([new Filter("countryCode", FilterOperator.EQ, sCountryCode)]);
        //     }
        // },
        // --- Refactored Country Change ---
        onChangeCountry: function (oEvent) {
            const oCountry = oEvent ? oEvent.getSource() : $C("signUpCountry");
            if (!oCountry) return;

            const oModel = this.getView().getModel("LoginMode");
            const oState = $C("signUpState");
            const oCity = $C("signUpCity");
            const oSTD = $C("signUpSTD");
            const oCountryModel = this.getOwnerComponent().getModel("CountryModel");

            if (!oCountryModel) return;

            if (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                oModel.setProperty("/State", "");
                oModel.setProperty("/City", "");
                oState.getBinding("items")?.filter([new Filter("stateName", "EQ", "__NONE__")]);
                oCity.getBinding("items")?.filter([new Filter("cityName", "EQ", "__NONE__")]);
            }
            // 2. Sanitize typing only if user is interacting
            if (oEvent) {
                const val = oCountry.getValue().replace(/[^a-zA-Z\s]/g, "");
                oCountry.setValue(val);
            }

            const aCountries = oCountryModel.getData() || [];
            const sSearch = oEvent ? oCountry.getValue() : oModel.getProperty("/Country");
            oModel.setProperty("/Country", sSearch);

            const oMatch = this._findBestMatch(sSearch, aCountries, "countryName");

            if (oMatch) {
                oCountry.setSelectedKey(oMatch.countryName);
                const sCountryCode = oMatch.code;

                // Filter States
                oState.getBinding("items").filter([new Filter("countryCode", FilterOperator.EQ, sCountryCode)]);

                // Mobile & STD
                const oMobile = $C("signUpPhone");
                if (oMobile) oMobile.setMaxLength(sCountryCode === "IN" ? 10 : 18);

                const oSTDItem = oSTD.getItems().find(i => i.getAdditionalText() === sCountryCode);
                if (oSTDItem) {
                    oSTD.setSelectedKey(oSTDItem.getKey());
                    oModel.setProperty("/STDCode", oSTDItem.getKey());
                    // we need to call onSTDChange to apply mobile validations
                    const stdControl = $C("signUpSTD");
                    if (stdControl) {
                        this.onSTDChange({
                            getSource: () => stdControl
                        });
                    }
                }
            } else {
                oState.getBinding("items").filter([new Filter("countryCode", "EQ", "__NONE__")]);
            }
        },

        onSTDChange: function (oEvent) {
            const oSTD = oEvent?.getSource?.() || $C("signUpSTD");
            if (!oSTD) return;

            const sValue = (oSTD.getValue() || "").trim();
            const oMobile = $C("signUpPhone");
            // Mandatory check (only if event exists)
            if (oEvent && !utils._LCvalidateMandatoryField(oEvent)) return;

            const STD_REGEX = /^\+[1-9][0-9]*$/;

            if (!STD_REGEX.test(sValue)) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("STD must start with + and contain only numbers (no leading zero)");

                oMobile.setValue("");
                oMobile.setMaxLength(18);
                return;
            }
            oSTD.setValueState("None");
            // oMobile.setValue("");
            oMobile.setMaxLength(sValue === "+91" ? 10 : 18);
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
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteManageProfile");
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
                    oStateCB.getBinding("items")?.filter([new Filter("countryCode", FilterOperator.EQ, sCountryCode)]);

                    if (sState) {
                        // Filter Cities by State + Country
                        const aFilters = [
                            new Filter("stateName", FilterOperator.EQ, sState),
                            new Filter("countryCode", FilterOperator.EQ, sCountryCode)
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

            if (!isMandatoryValid) return MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));

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
                filters: {
                    UserID: oModel.getProperty("/UserID")
                }
            };

            try {
                this.getBusyDialog();

                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                Object.assign(this._oLoggedInUser, payload.data);
                MessageToast.show(this.i18nModel.getText("profileUpdatedSuccessfully"));
            } catch (err) {
                MessageToast.show(this.i18nModel.getText("errorUpdatingProfile"));
            } finally {
                this.closeBusyDialog();
                oModel.setProperty("/isEditMode", false);
            }
        },

        onProfileclose: function () {
            if (this._oProfileDialog) this._oProfileDialog.close()
        },

        onEditProfilePic: function () {
            MessageToast.show(this.i18nModel.getText("profilepictureeditnotimplementedyet"))
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
                    DateofBirth: "",
                    Photo: ""
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
            const oTempModel = new JSONModel({
                bookings: [],
                isTableBusy: true
            });
            this.onPressAvatar({
                getSource: this.byId("ProfileAvatar")
            });
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
            MessageToast.show(this.i18nModel.getText("logoutSuccessful"));
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
        },

        onCancelDialog: function () {
            this.FCIA_Dialog.close()
        },

        onAdminPress: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteStudentDetails");
        },

        onWizardNext: function () {
            const oWizard = $C("idHostelWizard");
            const oNextButton = $C("idWizardNextBtn");
            const oBackButton = $C("idWizardBackBtn");
            const oSubmitButton = $C("idWizardSubmitBtn");
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
            const oWizard = $C("idHostelWizard");
            const oNextButton = $C("idWizardNextBtn");
            const oBackButton = $C("idWizardBackBtn");
            const oSubmitButton = $C("idWizardSubmitBtn");
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
            $C("idHostelWizardDialog").close();
        },

        onDoubleRoomPress: function () {
            this.Bookfragment()
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
            if (!sBranchCode) return MessageToast.show(this.i18nModel.getText("pleaseenterlocationsearch"));
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
            if (oRoomTypeCombo) oRoomTypeCombo.setEnabled(false);
        },

        onPressBookingRow: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("profileData");
            var oBookingData = oContext.getObject();
            // Now reuse your logic exactly as in onEditBooking
            var oProfileModel = this._oProfileDialog.getModel("profileData");
            var aCustomers = oProfileModel.getProperty("/aCustomers");
            var aFacilities = oProfileModel.getProperty("/facility");

            var sCustomerID = oBookingData.customerID || oBookingData.CustomerID || "";

            if (!sCustomerID) return MessageToast.show(this.i18nModel.getText("customerIDnotfoundforthisBooking"));

            var oCustomer = aCustomers.find(cust => cust.customerID === sCustomerID);
            if (!oCustomer) return MessageToast.show(this.i18nModel.getText("noCustomerDetailsfoundforthisBooking"));

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
            if (!oTotals) return;
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
            var oHostelModel = new JSONModel(oFullCustomerData);
            this.getOwnerComponent().setModel(oHostelModel, "HostelModel");

            // Navigate
            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(sCustomerID),
                from: "ManageProfile"
            });
        },

        onPressManageInvoice: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", {
                sPath: encodeURIComponent(oEvent.getSource().getBindingContext("profileData").getObject().InvNo),
                dash: "ManageInvoice"
            });
        },

        //  Separated calculation function
        calculateTotals: function (aPersons, sStartDate, sEndDate, RoomPrice) {
            const oStartDate = this._parseDate(sStartDate);
            const oEndDate = this._parseDate(sEndDate);

            if (!oStartDate || !oEndDate) {
                MessageToast.show(this.i18nModel.getText("invalidStartEndDate"));
                return null;
            }

            const diffTime = oEndDate - oStartDate;
            const iDays = Math.ceil(diffTime / (1000 * 3600 * 24));

            if (iDays <= 0) {
                MessageToast.show(this.i18nModel.getText("endDatemustbeafterStartDate"));
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
            if (sDate instanceof Date) return sDate;
            // Convert from DD/MM/YYYY or YYYY-MM-DD
            if (sDate.includes("/")) {
                const [d, m, y] = sDate.split("/");
                return new Date(`${y}-${m}-${d}`);
            } else {
                return new Date(sDate);
            }
        },

        onBranchSelectionChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            const oView = this.getView();
            const oAreaCombo = oView.byId("id_Area");
            const oRoomType = oView.byId("id_Roomtype");
            // Reset previous selections
            oAreaCombo.setSelectedKey("").setEnabled(false);
            oRoomType.setSelectedKey("").setEnabled(false);
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
            const oAreaModel = new JSONModel(aFiltered);
            oView.setModel(oAreaModel, "AreaModel");
            // 🔹 Enable the Area dropdown now that data is ready
            oAreaCombo.setEnabled(true);
            oRoomType.setEnabled(true);

        },

        // 🔹 When Area is selected, enable Room Type combo
        onAreaSelectionChange: function (oEvent) {
            const oRoomType = this.byId("id_Roomtype");
            const oSelectedItem = oEvent.getSource().getSelectedItem();
            (oSelectedItem) ? oRoomType.setEnabled(true) : oRoomType.setEnabled(true);
        },



        model: function (response) {
            const aRooms = response.data.HM_Rooms || [];
            const oRoomModel = new JSONModel({
                Rooms: aRooms
            });
            this.getView().setModel(oRoomModel, "RoomCountModel");

            const aCustomers = Array.isArray(response.data.HM_RoomData) ? response.data.HM_RoomData : [response.data.HM_RoomData];

            const oCustomerModel = new JSONModel(aCustomers);
            this.getView().setModel(oCustomerModel, "CustomerModel");
        },
        onRatingPress: function (oEvent) {
            var oSource = oEvent.getSource();

            // Get binding context of the clicked bed type
            var oCtx = oSource.getBindingContext("VisibilityModel");

            if (!oCtx) {
                return;
            }

            var oBedData = oCtx.getObject();
            this.getOwnerComponent().setModel(new JSONModel(oBedData), "SelectedBedType");

            this.getOwnerComponent().getRouter().navTo("RouteCustomerReview");

        },
        viewRooms: function (oEvent) {
            var oSource = oEvent.getSource();

            // Get binding context of the clicked bed type
            var oCtx = oSource.getBindingContext("VisibilityModel");

            if (!oCtx) {
                return;
            }

            var oBranchData = oCtx.getObject();

            this.getOwnerComponent().getRouter().navTo("RouteViewRooms", {
                sPath: oBranchData.BranchID
            });
        },
        onSearchRooms: async function () {
            this.iTop = 5
            this.iSkip = 0
            this.flag = true
            const oContainer = this.byId("idBedTypeFlex");
            oContainer.setBusy(true);

            // City
            var oBranchcity = this.byId("id_Branch").getSelectedKey() || this.byId("id_Branch").getValue();

            if (!oBranchcity) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectCity"));
                oContainer.setBusy(false);
                this.byId("id_Branch").setValueState("Error");
                return;
            }
            // AC Type
            const sSelectedACType = this.byId("id_Roomtype")?.getSelectedKey() || this.byId("id_Roomtype")?.getValue();


            // Locality ComboBox
            var oAreaCB = this.byId("id_Area");
            var sSelectedBranch = oAreaCB.getSelectedKey() || oAreaCB.getValue();
            var areaList = this.getView().getModel("AreaModel").getData() || [];
            // Check if selected or typed locality is valid
            var validArea = areaList.find(item => item.LandMark === sSelectedBranch || item.BranchID === sSelectedBranch);

            if (sSelectedBranch && !validArea) {
                // User typed something, but it does not match the list
                MessageToast.show(this.i18nModel.getText("pleaseselectlocality"));
                oContainer.setBusy(false);
                return;
            }
            // If locality is empty, keep it empty (search by city only)
            var finalBranch = validArea ? validArea.LandMark : "";
            if (finalBranch === "") this.byId("id_Area").setValueState("None");
            this.isInitialLoad = false;

            try {
                await this._loadFilteredData(oBranchcity, finalBranch, sSelectedACType);
            } catch (e) {
                console.log(e);
            } finally {
                oContainer.setBusy(false);
            }
        },
        onViewMoreRooms: async function () {
            // Load next page
            this.flag = false
            this.roomtype = false
            this.iSkip += this.iTop;
            const oContainer = this.byId("idViewMoreBusy")
            oContainer.setBusy(true)
            this.isInitialLoad = false;

            await this._loadFilteredData(this.Scity, this.sBranchCode, this.sACType);
            oContainer.setBusy(false);
        },


        Branch: async function (filter) {
            const response = await this.ajaxReadWithJQuery("HM_Branch", filter);
            this.Branchlength = response?.data.length || 0;
            this.getView().setModel(new JSONModel(response?.data), "BranchModel");

            // this.getOwnerComponent().getModel("sBRModel").setData(response?.data || []);
            let aData = response?.data || [];
            return Array.isArray(aData) ? aData : [];
        },

        _loadRoomsPageData: async function () {
            this.iTop = 5;
            this.iSkip = 0;

            this.roomtype = false

            this.byId("idBedTypeFlex").setBusy(true);
            this.byId("id_Branch").setBusy(true).setValueState("None");;
            this.byId("id_Area").setBusy(true);
            this.byId("id_Roomtype").setBusy(true);

            const oFooterModel = this.getView().getModel("FooterModel");

            oFooterModel.setProperty("/showRoomsFooter", false);
            try {
                var data = this.getOwnerComponent().getModel("sBRModel").getData()


                var FCity = data.find((item) => {
                    return item.City === "Kalaburagi"
                })
                var city = FCity ? FCity.City : data[0].City;
                var fCity = this.City ? this.City : city;

                var filter = {
                    flag: "true",
                    top: this.iTop,
                    skip: this.iSkip,
                    City: fCity
                }
                var oModelData = await this.Branch(filter);
                this.isInitialLoad = true;
                this._populateUniqueFilterValues(data)



                const sCity = this.City ? this.City : FCity ? FCity.City : data[0].City;

                const aFiltered = oModelData.filter(item => item.City === sCity);




                if (aFiltered.length === 0 || sCity) {
                    await this._loadFilteredData(sCity, "", "");
                } else {
                    await this._loadFilteredData(this.City, "", "");
                }
                const aUnique = aFiltered.filter((item, index, self) =>
                    index === self.findIndex(t => t.Name === item.Name && t.LandMark === item.LandMark)
                );
                this.getView().setModel(new JSONModel(aUnique), "AreaModel");

                // Default selections
                this.byId("id_Branch").setSelectedKey(sCity);
                this.byId("id_Area").setEnabled(true).setSelectedKey("");
                if (this.roomtype !== true) this.byId("id_Roomtype").setEnabled(true).setSelectedKey("");
            } catch (error) {
                console.log("Error loading Rooms:", error);
            } finally {
                this.byId("idBedTypeFlex").setBusy(false);
                this.byId("id_Branch").setBusy(false);
                this.byId("id_Area").setBusy(false);
                this.byId("id_Roomtype").setBusy(false);
                // ✅ show ROOMS footer after success OR failure
                oFooterModel.setProperty("/showRoomsFooter", true);
            }
        },
        _loadFilteredData: async function (Scity, sBranchCode, BranchName) {
            const oView = this.getView();
            const oVisibilityModel = oView.getModel("VisibilityModel");

            var data = this.getOwnerComponent().getModel("sBRModel").getData()

            var Branchdata = data.filter((item) => {
                return item.City === Scity
            })
            this.Branchlength = Branchdata.length
            try {
                let aBranchesData;
                if (!this.isInitialLoad) {
                    let response = await this.ajaxReadWithJQuery("HM_Branch", {
                        City: Scity,
                        LandMark: sBranchCode,
                        Name: BranchName,
                        top: this.iTop,
                        skip: this.iSkip,
                        flag: "true"
                    });
                    aBranchesData = response?.data || [];
                    // this.Branchlength = aBranchesData.length || 0;
                    if (sBranchCode || BranchName) {
                        this.Branchlength = aBranchesData.length
                    }
                  
                    let oAreaModel = this.getView().getModel("AreaModel");
                    let aExistingData = oAreaModel.getData() || [];

                    let aFilteredData = aBranchesData.filter(newItem => {
                        return !aExistingData.some(existingItem =>
                            existingItem.Name === newItem.Name
                        );
                    });

                    let aUpdatedData = [...aExistingData, ...aFilteredData];

                    this.getView().getModel("AreaModel").setData(aUpdatedData);
                } else {
                    const oBRModel = oView.getModel("BranchModel");
                    aBranchesData = oBRModel?.getData() || [];
                }
                let aFilteredBranches = [];
                if (Scity && !sBranchCode) {
                    aFilteredBranches = aBranchesData.filter(branch =>
                        branch.City === Scity
                    );
                } else if (sBranchCode) {
                    aFilteredBranches = aBranchesData.filter(branch =>
                        branch.LandMark === sBranchCode
                    );
                } else {
                    aFilteredBranches = aBranchesData;
                }
                if (aFilteredBranches.length === 0) {
                    oVisibilityModel.setProperty("/Branches", []);
                    oVisibilityModel.setProperty("/NoData", true);
                    oVisibilityModel.setProperty("/ShowViewMore", false);
                    return;
                }

                // 🔥 Convert Base64 to Image
                const convertBase64ToImage = (base64String, fileType) => {
                    if (!base64String) return "./image/Fallback.png";

                    let sBase64 = base64String.replace(/\s/g, "");

                    if (sBase64.startsWith("data:image")) return sBase64;

                    const mimeType = fileType || "image/jpeg";
                    return `data:${mimeType};base64,${sBase64}`;
                };

                const aBranches = aFilteredBranches.map(branch => {

                    const sImage = convertBase64ToImage(
                        branch.Attachment,
                        branch.AttachmentType
                    );

                    return {
                        BranchID: branch.BranchID,
                        Name: branch.Name,
                        City: branch.City,
                        Address: branch.Address,
                        PropertyType:branch.PropertyType,
                        LandMark: branch.LandMark,
                        Country: branch.Country,
                        GSTIN: branch.GSTIN,
                        CheckInTime: branch.CheckinTime,
                        CheckOutTime: branch.CheckoutTime,
                        GeoLocation: branch.GeoLocation,
                        Image: sImage,
                        TotalFeedbacks: branch.TotalFeedbacks,
                        AverageRating: branch.AverageRating,
                        StartingPrice:branch.StartingPrice,
                        Currency:branch.Currency
                    };
                });
                this.Scity = Scity
                this.sBranchCode = sBranchCode
                this.sACType = BranchName
                if (this.iSkip === 0) {
                    oVisibilityModel.setProperty("/Branches", aBranches);
                } else {
                    let existing = oVisibilityModel.getProperty("/Branches") || [];
                    oVisibilityModel.setProperty("/Branches", [...existing, ...aBranches]);
                }

                oVisibilityModel.setProperty("/ShowViewMore", oVisibilityModel.getProperty("/Branches").length !== this.Branchlength);
                if (oView.getModel("VisibilityModel").getData().Branches.length === 0) {
                    oView.getModel("VisibilityModel").setProperty("/NoData", true);
                } else {
                    oView.getModel("VisibilityModel").setProperty("/NoData", false);
                }

            } catch (err) {
                MessageToast.show("Failed to load branch data");
            }
        },

        onBookNow: function (oEvent) {
            const oItem = oEvent.getSource().getBindingContext("VisibilityModel").getObject();

            let oHostelModel = sap.ui.getCore().getModel("HostelModel");
            if (!oHostelModel) {
                oHostelModel = new JSONModel({});
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
            if (!oedit) return oSaveModel.setProperty("/isEditMode", true);

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
                MessageToast.show(this.i18nModel.getText("dataSavedSuccessfully"));
                oSaveModel.setProperty("/isEditMode", false);
            } catch (error) {
                MessageToast.show(this.i18nModel.getText("failed"));
            }
        },

        FSM_onConfirm: function (oEvent) {
            const oInput = oEvent?.getSource();
            if (!oInput) return false;

            const confirm = (oInput.getValue() || "").trim();
            const pass = $C("signUpPassword").getValue().trim();
            // Required
            if (!confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("confirmPasswordRequired"));
                return false; // ✅ EXPLICIT FAIL
            }
            // Compare
            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                return false; // ✅ EXPLICIT FAIL
            }
            // Success
            oInput.setValueState("None");
            return true; // ✅ EXPLICIT PASS
        },

        Forget_onConfirm: function (oEvent) {
            const confirm = oEvent.getSource().getValue().trim();
            const pass = $C("newPass").getValue().trim();
            const oInput = $C("confPass");
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
            this.oViewModel.setProperty("/authFlow", "forgot");
            this.oViewModel.setProperty("/forgotStep", 1); // RESET to step 1
        },

        onForgotPassword: function () {
            this._resetOtpState();
            this.oViewModel.setProperty("/authFlow", "forgot");
            this.oViewModel.setProperty("/forgotStep", 1); // safe, runtime only
            this.oViewModel.setProperty("/dialogTitle", "Set / Reset Password"); //
            this._addPasswordGenerateIcon();
        },

        onSelectLoginMode: function (e) {
            const mode = e.getSource().getText().toLowerCase(); // "password" or "otp"

            this.oViewModel.setProperty("/loginMode", mode);

            // 🔥 Always reset OTP field visibility when switching modes
            this.oViewModel.setProperty("/showOTPField", false);
            this.oViewModel.setProperty("/isOtpEntered", false);
            // 🔥 Clean OTP input field and disable it
            const otpCtrl = $C("signInOTP");
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }
            // 🔥 Reset password field too (fresh mode)
            const passCtrl = $C("signinPassword");
            if (passCtrl) {
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }
            // 🔥 Hide Send OTP button unless user is in OTP mode
            const btnSendOtp = $C("btnSignInSendOTP");
            if (btnSendOtp) {
                btnSendOtp.setVisible(mode === "otp");
            }
        },

        _clearAllAuthFields: function () {
            const ids = ["signInEmail", "signinPassword", "fpEmailId", "fpOTP", "newPass", "confPass", "loginOTP"];
            ids.forEach(id => {
                const c = $C(id);
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
            ["signInEmail", "signinPassword"].forEach(id => {
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
            const oVM = this.oViewModel;
            oVM.setProperty("/selectedAccountType", "personal");
            oVM.setProperty("/authFlow", "signin");
            this._resetOtpState();

            // Clear all fields including forgot/otp/reset
            this._clearAllAuthFields();

            // Remove blur effect from the background
            this.getView().removeStyleClass("blur-background");
        },

        _showPanel: function (panelId) {
            const aPanels = ["signInPanel", "signUpPanel", "forgotFlowPanel"];

            aPanels.forEach(id => {
                const c = $C(id);
                if (c) c.setVisible(id === panelId);
            });
        },

        onSubmitNewPassword: async function () {
            const oNew = $C("newPass");
            const oConf = $C("confPass");

            const pass = oNew.getValue().trim();
            const confirm = oConf.getValue().trim();

            // RESET state before validation
            oNew.setValueState("None");
            oConf.setValueState("None");
            // 1) Required check for New Password
            if (!pass) {
                oNew.setValueState("Error");
                oNew.setValueStateText(this.i18nModel.getText("passwordRequired"));
                return MessageToast.show(this.i18nModel.getText("passwordRequired"));
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
                return MessageToast.show(this.i18nModel.getText("confirmPasswordRequired"));
            }
            // 4) Match both
            if (pass !== confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                return MessageToast.show(this.i18nModel.getText("nopasswordmatch"));
            }

            // 🔥 PASSED ALL VALIDATIONS → SUCCESS STATE
            oConf.setValueState("None");
            // oConf.setValueStateText("Passwords matched");
            this.getBusyDialog();
            try {
                const oFilters = this._oResetUser?.UserID ? {
                    UserID: this._oResetUser.UserID
                } : {
                    EmailID: this._oResetUser?.EmailID
                };

                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: {
                        Password: btoa(pass)
                    },
                    filters: oFilters
                });

                MessageBox.success("Password updated successfully", {
                    title: "Success",
                    styleClass: "myUnifiedBtn",
                    onClose: () => {
                        // fully clean values
                        this._clearAllAuthFields?.();
                        this._clearForgotFlow?.();

                        // reset dialog title
                        $C("authDialog").getCustomHeader().getContentMiddle()[0].setText("Sign In");

                        this.oViewModel.setProperty("/authFlow", "signin");
                        // show login panel
                        this.oViewModel.setProperty("/authFlow", "signin");
                        this.oViewModel.setProperty("/forgotStep", 1);
                        this.oViewModel.setProperty("/dialogTitle", "Sign In");
                    }
                });

            } catch (err) {
                MessageToast.show(this.i18nModel.getText("passwordResetFailed"));
            } finally {
                this.closeBusyDialog(); // ALWAYS stop
                this._resetOtpState();
            }
        },

        _resetAllAuthFields: function () {
            ["signInEmail", "signinPassword", "fpEmailId", "fpOTP", "newPass", "confPass", "loginOTP"]
                .forEach(id => {
                    let o = $C(id);
                    if (o) o.setValue("");
                });
        },

        _verifyOTPWithBackend: async function (otp) {
            this.getBusyDialog();
            try {
                const oPayload = {
                    ...(this._oResetUser?.EmailID ? {
                        EmailID: this._oResetUser.EmailID
                    } : {
                        UserID: this._oResetUser?.UserID,
                        UserName: this._oResetUser?.UserName
                    }),
                    OTP: otp.trim()
                };
                // Call the BaseController Generic Read method
                const oResp = await this.ajaxReadWithJQuery("HM_Login", oPayload);
                return oResp?.success === true;
            } catch (err) {
                return false;
            } finally {
                this.closeBusyDialog();
            }
        },

        onLoginOtpLive: function (e) {
            const input = e.getSource();

            // allow only digits and enforce 6 max
            let val = e.getParameter("value").replace(/\D/g, "");
            if (val.length > 6) val = val.slice(0, 6);

            input.setValue(val);

            const isValid = val.length === 6;
            this.oViewModel.setProperty("/isOtpEntered", isValid);

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
            const oEmailCtrl = $C("signInEmail");
            const sEmail = oEmailCtrl?.getValue()?.trim() || "";
            // Validate input
            if (!utils._LCvalidateMandatoryField(oEmailCtrl, "ID") || !utils._LCvalidateEmail(oEmailCtrl, "ID")) return MessageToast.show(this.i18nModel.getText("MSenterValidEmail"));

            const payload = {
                EmailID: sEmail,
                Type: "OTP"
            };
            this.getBusyDialog();
            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);
                if (oResp?.success) {
                    MessageToast.show(this.i18nModel.getText("oTPSentCheckyourEmail"));
                    this._oResetUser = {
                        EmailID: sEmail
                    };
                    this.oViewModel.setProperty("/showOTPField", true);

                    const oOtpCtrl = $C("signInOTP");
                    oOtpCtrl.setEnabled(true);
                    oOtpCtrl.setValue("");
                    oOtpCtrl.setValueState("None");
                    oOtpCtrl.setValueStateText("");
                    oOtpCtrl.focus();
                    this._startOtpValidity(); //  10-minute validity starts HERE
                    this._startOtpResend(120) //120xx
                } else {
                    MessageToast.show(this.i18nModel.getText("usernotFoundUnabletoSendOTP"));
                }
            } catch (err) {
                const sMsg =
                    err?.responseJSON?.message ||
                    this.i18nModel.getText("invalidCredentialsPleasetryagain");
                sap.m.MessageToast.show(sMsg);
            } finally {
                this.closeBusyDialog();
            }
        },

        _onVerifyOTP: async function () {
            const flow = this.oViewModel.getProperty("/authFlow");
            // Resolve OTP control by flow
            const oOtpInput = (flow === "forgot") ? $C("fpOTP") : $C("signInOTP");
            const otp = oOtpInput.getValue().trim();
            // --- Basic validation ---
            if (!otp) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText(this.i18nModel.getText("pleaseEnterOTP"));
                return MessageToast.show(this.i18nModel.getText("enterOTP"));
            }
            if (!/^\d{6}$/.test(otp)) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                return MessageToast.show(this.i18nModel.getText("invalidOTP"));
            }
            // Clear any previous error state
            oOtpInput.setValueState(sap.ui.core.ValueState.None);
            oOtpInput.setValueStateText("");
            // --- Backend verification ---
            let isValid = false;
            try {
                const expiryTs = this.oViewModel.getProperty("/otpExpiryTs");
                if (!expiryTs || Date.now() > expiryTs) return this._onOtpExpired();
                isValid = await this._verifyOTPWithBackend(otp);
            } catch (e) {
                return MessageToast.show(this.i18nModel.getText("oTPVerificationFailed"));
            }
            if (!isValid) return MessageToast.show(this.i18nModel.getText("incorrectOTP"));

            // 🔥 OTP VERIFIED SUCCESSFULLY → DESTROY EXPIRY STATE (INLINE)
            this._clearOtpValidityTimer();
            this._clearOtpResendTimer();
            this.oViewModel.setProperty("/otpExpiryTs", null);
            this.oViewModel.setProperty("/otpValidityText", "");

            // 📌 Forgot Password Flow
            if (flow === "forgot") return this.oViewModel.setProperty("/forgotStep", 3);

            try {
                const resp = await this.ajaxReadWithJQuery("HM_Login", {
                    UserID: this._oResetUser?.UserID,
                    UserName: this._oResetUser?.UserName,
                    OTP: otp
                });

                MessageToast.show(this.i18nModel.getText("loginSuccessful"));
                this._setLoggedInUser(resp.data[0]);
                this._resetAllAuthFields();
                this._oSignDialog.close();
            } catch (e) {
                MessageToast.show(this.i18nModel.getText("loginFailed"));
            }
        },

        onShowForgotUser: function () {
            this._showForgotSection("secForgotUser")
        },

        onBackToLogin: function () {
            this._clearAllAuthFields();
            // Reset only values (not visibility/enabled state)
            $C("fpEmailId").setValue("");
            $C("fpOTP").setValue("");
            $C("newPass").setValue("");
            $C("confPass").setValue("");

            this.oViewModel.setProperty("/loginMode", "password");
            this.oViewModel.setProperty("/authFlow", "signin");
            this.oViewModel.setProperty("/forgotStep", 1);

            this.oViewModel.setProperty("/authFlow", "signin");
            this.oViewModel.setProperty("/forgotStep", 1);
            this.oViewModel.setProperty("/dialogTitle", "Sign In");
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

            // 🔥 CRITICAL: Set the photo from backend
            if (user.FileContent) {
                oLoginModel.setProperty("/Photo", "data:image/png;base64," + user.FileContent);
            } else {
                oLoginModel.setProperty("/Photo", "");
            }

            this._oLoggedInUser = user;

            if (user.Role === "Customer") { } else {
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
                    await this.selfieSegmentation.send({
                        image: oVideo
                    });
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
                if (!oInput) return;

                uploader.clear();
                uploader.setValue("");
                oInput.value = "";
                oInput.accept = "image/*";
                oInput.capture = ""; // remove camera request → gallery
                oInput.click();
            }, 200);
        },

        onAvatarFileSelected: function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (!file) return;
            const MAX_SIZE = 2 * 1024 * 1024; // 2MB
            if (file.size > MAX_SIZE) {
                MessageToast.show("File size must be less than 2 MB.\nSelected file size: " + (file.size / 1024 / 1024).toFixed(2) + " MB");
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

        updateUserPhoto: async function ({
            fileName,
            fileType,
            fileContent
        }) {
            try {
                const sUserID = this._oLoggedInUser?.UserID;
                const payload = {
                    data: {
                        FileName: fileName,
                        FileType: fileType,
                        FileContent: fileContent
                    },
                    filters: {
                        UserID: sUserID
                    }
                };
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                this._oLoggedInUser.FileContent = fileContent;
                this._oLoggedInUser.Photo = "data:image/png;base64," + fileContent;

                (!fileContent) ? MessageToast.show(this.i18nModel.getText("profilephotoremovedsuccessfully")) : MessageToast.show(this.i18nModel.getText("profilephotoupdatedsuccessfully"));
            } catch (err) {
                MessageToast.show(this.i18nModel.getText("failedtoUpdateProfilePhoto"));
            }
        },

        onPreviewProfilePhoto: function () {
            const sPhoto = this._oProfileDialog.getModel("profileData").getProperty("/photo");
            if (!sPhoto) return MessageToast.show(this.i18nModel.getText("noProfilePhotoAvailable"));

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
            $C("previewProfileImage").setSrc(sPhoto);
            this._oPreviewDialog.open();
        },

        onSigninPasswordLive: function (oEvent) {
            utils._LCvalidatePassword(oEvent.getSource())
        },

        onSignIn: async function () {
            const vm = this.oViewModel;
            const isOTP = vm.getProperty("/loginMode") === "otp";
            const oLoginModel = this.getView().getModel("LoginModel");

            const oEmailCtrl = $C("signInEmail");
            const sEmail = oEmailCtrl?.getValue()?.trim() || "";
            const sPassword = $C("signinPassword").getValue().trim();
            const sOTP = $C("signInOTP").getValue().trim();

            // Common mandatory fields
            if (
                !utils._LCvalidateMandatoryField(oEmailCtrl, "ID") ||
                !utils._LCvalidateEmail(oEmailCtrl, "ID")
            ) {
                return MessageToast.show(this.i18nModel.getText("MSenterValidEmail"));
            }

            try {
                this.getBusyDialog();

                let payload, oResponse;
                // ----------------------------- OTP MODE -----------------------------
                if (isOTP) {
                    const vm = this.oViewModel;
                    const showOTPField = vm.getProperty("/showOTPField");
                    const isOtpEntered = vm.getProperty("/isOtpEntered");

                    const otpCtrl = $C("signInOTP");

                    // 1️⃣ OTP has NOT been generated
                    if (!showOTPField) return MessageToast.show(this.i18nModel.getText("pleaseGenerateOTPFirst"));
                    // 2️⃣ OTP was generated but user has not typed anything
                    if (!isOtpEntered) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
                        return MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                    }
                    // 3️⃣ Validate OTP format strictly
                    if (!/^\d{6}$/.test(sOTP)) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                        return MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                    }
                    const expiryTs = vm.getProperty("/otpExpiryTs");
                    if (!expiryTs || Date.now() > expiryTs) return this._onOtpExpired();

                    // 4 Backend verification
                    const isValid = await this._verifyOTPWithBackend(sOTP);
                    if (!isValid) return MessageToast.show(this.i18nModel.getText("incorrectOTP"));

                    // 5️⃣ Construct payload and continue login
                    payload = {
                        EmailID: sEmail,
                        OTP: sOTP
                    };
                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                } else {
                    // -------------------------- PASSWORD MODE -------------------------
                    const passCtrl = $C("signinPassword");

                    // Required
                    if (!sPassword) {
                        passCtrl.setValueState("Error");
                        passCtrl.setValueStateText(this.i18nModel.getText("passwordRequired"));
                        return MessageToast.show(this.i18nModel.getText("passwordRequired"));
                    }
                    // Format validation
                    if (!utils._LCvalidatePassword(passCtrl)) {
                        passCtrl.setValueState("Error");
                        passCtrl.setValueStateText(this.i18nModel.getText("enterValidPassword"));
                        return MessageToast.show(this.i18nModel.getText("enterValidPassword"));
                    }
                    // If valid
                    passCtrl.setValueState("None");
                    if (!utils._LCvalidatePassword($C("signinPassword"))) return MessageToast.show(this.i18nModel.getText("entervalidpassword"));

                    payload = {
                        EmailID: sEmail,
                        Password: btoa(sPassword)
                    };
                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                }
                // ---------------------------- HANDLE RESPONSE ----------------------------
                const user = oResponse?.data?.[0];
                
                // if (!user?.UserID) {
                oLoginModel.setProperty("/isLoggedIn", true);
                this.getOwnerComponent().getRootControl().getController()._startSessionTracking();
                if (!user?.UserID) return MessageToast.show(this.i18nModel.getText("invalidCredentials"));
                this._setLoggedInUser(user);

                this._oLoggedInUser = user;
                oLoginModel.setProperty("/EmployeeID", user.UserID);
                oLoginModel.setProperty("/Salutation", user.Salutation);
                oLoginModel.setProperty("/EmployeeName", user.UserName);
                oLoginModel.setProperty("/UserName", user.UserName);
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
                    const oUserModel = new JSONModel(user);
                    sap.ui.getCore().setModel(oUserModel, "LoginModel");
                    this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", true);
                } else {
                    this.getOwnerComponent().getRouter().navTo("TilePage");
                }
                // Reset login fields
                $C("signInEmail").setValue("");
                $C("signinPassword").setValue("");
                $C("signInOTP").setValue("");
                // Close dialog
                if (this._oSignDialog){
                    this.getView().removeStyleClass("blur-background");
                    this._oSignDialog.close(),this._oSignDialog.destroy();
        this._oSignDialog = null;
                }
                if (this._imageInterval) {
        clearInterval(this._imageInterval)}
            } catch (err) {
                MessageToast.show(err.message || "Invalid credentials, please try again");
            } finally {
                this.closeBusyDialog();
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
            ["State", "City", "STDCode", "phone"].forEach(p => oModel.setProperty("/" + p, ""));

            /* ---------------- Reset UI ---------------- */
            oStateCB?.setSelectedKey("");
            oCityCB?.setSelectedKey("");
            oCityCB?.setValue("");
            oSTD?.setValue("");
            oMobile?.setValue("");

            oStateCB?.getBinding("items")?.filter([]);
            oCityCB?.getBinding("items")?.filter([]);

            const oItem = oCountry.getSelectedItem();
            if (!oItem) return oModel.setProperty("/Country", "");

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
                    new Filter("countryCode", FilterOperator.EQ, sCountryCode)
                ]);
            }
        },

        _onProfileSTDChange: function () {
            const oSTD = this.byId("id_std");
            const oMobile = this.byId("id_phone");
            const std = oSTD.getValue();
            oMobile.setValue("");
            // Dynamic mobile length
            (std === "+91") ? oMobile.setMaxLength(10) : oMobile.setMaxLength(18);
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
            if (val.length === 0) return oInput.setValueState("None");

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
            oCityCB?.setSelectedKey("");
            oCityCB?.setValue("");
            oCityCB?.getBinding("items")?.filter([]);
            // No state selected → clear state in model and exit
            if (!oItem) return oModel.setProperty("/State", "");

            const sStateName = oItem.getKey(); // or getText(), depending on your binding
            const sCountryCode = oCountryCB.getSelectedItem()?.getAdditionalText();
            // Save state in model
            oModel.setProperty("/State", sStateName);
            // Filter cities by state + country
            oCityCB?.getBinding("items")?.filter([
                new Filter("stateName", FilterOperator.EQ, sStateName),
                new Filter("countryCode", FilterOperator.EQ, sCountryCode)
            ]);
        },

        CC_onChangeCity: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            const oModel = this._oProfileDialog.getModel("profileData");
            const oItem = oEvent.getSource().getSelectedItem();
            // Clear value state on city
            oEvent.getSource().setValueState("None");
            if (!oItem) return oModel.setProperty("/City", "");

            const sCityName = oItem.getKey(); // or getText(), as per your binding
            // Save in model
            oModel.setProperty("/City", sCityName);
        },

        onValidateUser: async function () {
            const oEmailCtrl = $C("fpEmailId");
            const isValid =
                utils._LCvalidateMandatoryField(oEmailCtrl, "ID") &&
                utils._LCvalidateEmail(oEmailCtrl, "ID");

            if (!isValid) return MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));

            const sEmail = oEmailCtrl.getValue().trim();
            this.getBusyDialog();
            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", {
                    EmailID: sEmail,
                    Type: "OTP"
                });
                if (oResp?.success) {
                    MessageToast.show(this.i18nModel.getText("oTPSentCheckyourEmail"));

                    this._oResetUser = {
                        EmailID: sEmail
                    };

                    this._startOtpValidity();
                    this._startOtpResend(120);

                    this.oViewModel.setProperty("/forgotStep", 2);
                } else {
                    MessageToast.show(this.i18nModel.getText("noUserFoundwithGivenIDName"));
                }

            } catch (err) {
                const sMsg = err?.responseJSON?.message || this.i18nModel.getText("forgotOtpSendFailed");
                MessageToast.show(sMsg);
            } finally {
                this.closeBusyDialog();
            }
        },

        _clearOtpResendTimer: function () {
            if (this._otpResendInterval) {
                clearInterval(this._otpResendInterval);
                this._otpResendInterval = null;
            }
        },

        _startOtpResend: function (seconds = 120) { //120xx
            let remaining = seconds;
            this._clearOtpResendTimer();
            this.oViewModel.setProperty("/canResendOTP", false);
            this.oViewModel.setProperty("/otpButtonText", `Resend OTP (${remaining}s)`);
            this._otpResendInterval = setInterval(() => {
                remaining--;

                if (remaining <= 0) {
                    this._clearOtpResendTimer();
                    this.oViewModel.setProperty("/canResendOTP", true);
                    this.oViewModel.setProperty("/otpButtonText", "Resend OTP");
                    return;
                }
                this.oViewModel.setProperty("/otpButtonText", `Resend OTP (${remaining}s)`);
            }, 1000);
        },

        _resetOtpState: function () {
            this._clearOtpResendTimer();
            this._clearOtpValidityTimer();

            this.oViewModel.setProperty("/otpExpiryTs", null);
            this.oViewModel.setProperty("/otpValidityText", "");
            this.oViewModel.setProperty("/canResendOTP", true);
            this.oViewModel.setProperty("/otpButtonText", "Send OTP");
            this.oViewModel.setProperty("/showOTPField", false);
            this.oViewModel.setProperty("/isOtpEntered", false);

            const otpCtrl = $C("signInOTP");
            otpCtrl?.setValue("");
            otpCtrl?.setEnabled(false);
            otpCtrl?.setValueState("None");
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
                                new Filter("BookingID", FilterOperator.Contains, sQuery.toString()),
                                new Filter("InvNo", FilterOperator.Contains, sQuery.toString()),
                                new Filter("InvoiceDate", FilterOperator.Contains, sQuery.toString()),
                                new Filter("CustomerName", FilterOperator.Contains, sQuery.toString()),
                                new Filter("TotalAmount", FilterOperator.Contains, sQuery.toString()),
                                new Filter("DueAmount", FilterOperator.Contains, sQuery.toString())
                            ],
                            and: false
                        })
                    ];
                } else {
                    aFilters = [
                        new sap.ui.model.Filter({
                            filters: [
                                new Filter("customerName", FilterOperator.Contains, sQuery.toString()),
                                new Filter("BookingID", FilterOperator.Contains, sQuery.toString()),
                                new Filter("BookingDate", FilterOperator.Contains, sQuery.toString()),
                                new Filter("room", FilterOperator.Contains, sQuery.toString()),
                                new Filter("status", FilterOperator.Contains, sQuery.toString()),
                                new Filter("amount", FilterOperator.Contains, sQuery.toString()),
                                new Filter("currency", FilterOperator.Contains, sQuery.toString())
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
            this._updateRowCount()
        },

        _updateRowCount: function () {
            const oProfileModel = this._oProfileDialog.getModel("profileData");
            const sSelectedTab = oProfileModel.getProperty("/selectedTab");
            const oTable = sSelectedTab === "Payment" ? this.byId("Id_PaymentTable") : this.byId("Id_ProfileaTable");
            const oBinding = oTable.getBinding("items");
            const length = oBinding ? oBinding.getLength() : 0;

            (sSelectedTab === "Payment") ? oProfileModel.setProperty("/paymentCount", length) : oProfileModel.setProperty("/bookingCount", length);
        },
///
        onAdminSIGNUP: function () {
            if (!this._oAdminSignup) {
                this._oAdminSignup = sap.ui.xmlfragment("sap.ui.com.project1.fragment.AdminSignup", this);
                this.getView().addDependent(this._oAdminSignup);
                this._FragmentDatePickersReadOnly(["adminDOB"]);
                const oDocType = $C("adminDocType");
                this._adminDocTypeBackup = oDocType.getItems().map(i => ({
                    key: i.getKey(),
                    text: i.getText()
                }));
                this._oAdminSignup.attachAfterClose(() => {
                    this.getView().removeStyleClass("blur-background");
                    this._resetAdminSignupForm();
                });
            }

            // DOB Limits
            const oDate = $C("adminDOB");
            if (oDate) {
                const now = new Date();
                oDate.setMaxDate(now);
                // oDate.setMinDate(new Date(2000, 0, 1));
            }

            this.getView().addStyleClass("blur-background");
            this._oAdminSignup.open();


            // 2. Control level Busy Indicator logic
            const oCountryCB = $C("adminsignUpCountry"); // Ya "signUpCountry" customer ke liye
            const oCountryModel = this.getOwnerComponent().getModel("CountryModel");

            // Agar model/data abhi tak nahi aaya
            if (!oCountryModel || !oCountryModel.getData() || oCountryModel.getData().length === 0) {
                oCountryCB.setBusy(true); // Sirf is field par spinner dikhega
                $C("adminsignUpState").setEnabled(false);
                $C("adminsignUpCity").setEnabled(false);
                $C("adminsignUpSTD").setEnabled(false);
                $C("adminMobileNo").setEnabled(false);


                // Background check (Fuzzy logic aur auto-populate ke liye)
                const nInterval = setInterval(() => {
                    const oLatestModel = this.getOwnerComponent().getModel("CountryModel");
                    if (oLatestModel && oLatestModel.getData() && oLatestModel.getData().length > 0) {
                        clearInterval(nInterval);
                        $C("adminsignUpState").setEnabled(true);
                        $C("adminsignUpCity").setEnabled(true);
                        $C("adminsignUpSTD").setEnabled(true);
                        $C("adminMobileNo").setEnabled(true);
                        oCountryCB.setBusy(false); // Spinner hatao

                        // Ab auto-populate start karo
                        this._triggerAutoPopulation();
                    }
                }, 300);
            } else {
                // Data pehle se hai, toh seedha trigger karo
                this._triggerAutoPopulation();
            }



        },
        _triggerAutoPopulation: function () {
            const oModel = this.getView().getModel("AdminSignupModel"); // Ya "LoginMode"

            if (this.Country) {
                // Country set karo aur fuzzy match trigger karo
                oModel.setProperty("/Country", this.Country);
                this.ADMIN_onChangeCountry(null);

                // State ke liye thoda wait (taaki filtering complete ho jaye)
                setTimeout(() => {
                    if (this.State) {
                        oModel.setProperty("/State", this.State);
                        this.ADMIN_onChangeState(null);

                        // City ke liye thoda aur wait
                        setTimeout(() => {
                            if (this.City) {
                                oModel.setProperty("/City", this.City);
                                this.ADMIN_onChangeCity(null);
                            }
                        }, 400);
                    }
                }, 400);
            }
        },

        onCloseAdminSignup: function () {
            if (this._oAdminSignup) {
                this._resetAdminSignupForm();
                this._oAdminSignup.close();
            }
        },

        ADMIN_onChangeCountry: function (oEvent) {
            const oCountry = oEvent ? oEvent.getSource() : $C("adminsignUpCountry");
            if (!oCountry) return;

            const oModel = this.getView().getModel("AdminSignupModel");
            const oStateModel = this.getView().getModel("StateModel");
            const oCountryModel = this.getView().getModel("CountryModel") || this.getOwnerComponent().getModel("CountryModel");
            const oCityModel = this.getView().getModel("CityModel");

            if (!oCountryModel) return;

            // 2. Sanitize typing only if user is interacting
            // if (oEvent) {
            //     const val = oCountry.getValue().replace(/[^a-zA-Z\s]/g, "");
            //     oCountry.setValue(val);
            // }

            if (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                oModel.setProperty("/State", "");
                oModel.setProperty("/City", "");
                oStateModel.setProperty("/filtered", []);
                oCityModel.setProperty("/filtered", []);
            }

            const aCountries = oCountryModel.getData() || [];
            const sSearch = oModel.getProperty("/Country");

            // --- FUZZY LOGIC INTEGRATION ---
            const oMatch = this._findBestMatch(sSearch, aCountries, "countryName");

            if (oMatch) {
                oCountry.setSelectedKey(oMatch.countryName);
                const sCountryCode = oMatch.code;

                // Filter States
                const allStates = oStateModel.getData() || [];
                const filteredStates = allStates.filter(s => s.countryCode === sCountryCode);
                oStateModel.setProperty("/filtered", filteredStates);

                // Mobile & STD
                const oMobile = $C("adminMobileNo");
                if (oMobile) oMobile.setMaxLength(sCountryCode === "IN" ? 10 : 18);
                this._autoSelectSTD(sCountryCode);
            }
        },

        ADMIN_onChangeState: function (oEvent) {
            const oState = oEvent ? oEvent.getSource() : $C("adminsignUpState");
            const oModel = this.getView().getModel("AdminSignupModel");
            const oStateModel = this.getView().getModel("StateModel");
            const oCityModel = this.getView().getModel("CityModel");

            if (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                oModel.setProperty("/City", "");
                oCityModel.setProperty("/filtered", []);


            }

            const aFilteredStates = oStateModel.getProperty("/filtered") || [];
            const sStateSearch = oModel.getProperty("/State");

            // --- FUZZY LOGIC INTEGRATION ---
            const oMatch = this._findBestMatch(sStateSearch, aFilteredStates, "stateName");

            if (oMatch) {
                oState.setSelectedKey(oMatch.stateName);
                const sStateName = oMatch.stateName;

                // Country Code nikalne ke liye Country control se check karein
                const oCountry = $C("adminsignUpCountry");
                const sCountryCode = oCountry.getSelectedItem()?.getAdditionalText()?.trim() || "IN";

                // Filter Cities
                const allCities = oCityModel.getData() || [];
                const filteredCities = allCities.filter(c =>
                    c.countryCode === sCountryCode && c.stateName === sStateName
                );
                oCityModel.setProperty("/filtered", filteredCities);
            }
        },

        ADMIN_onChangeCity: function (oEvent) {
            const oCityCtrl = oEvent ? oEvent.getSource() : $C("adminsignUpCity");
            const oModel = this.getView().getModel("AdminSignupModel");
            const oCityModel = this.getView().getModel("CityModel");

            if (oEvent) utils._LCvalidateMandatoryField(oEvent);

            const aFilteredCities = oCityModel.getProperty("/filtered") || [];
            const sCitySearch = oModel.getProperty("/City");

            // --- FUZZY LOGIC INTEGRATION ---
            const oMatch = this._findBestMatch(sCitySearch, aFilteredCities, "cityName");

            if (oMatch) {
                oCityCtrl.setSelectedKey(oMatch.cityName);
                oModel.setProperty("/City", oMatch.cityName);
                oCityCtrl.setValueState("None");
            } else {
                // Agar match nahi mila toh jo type kiya wahi rehne dein
                oModel.setProperty("/City", sCitySearch);
            }
        },
        _findBestMatch: function (sInput, aItems, sPropertyName) {
            if (!sInput || !aItems || aItems.length === 0) return null;
            const sNormInput = sInput.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

            // 1. Exact Match try karein
            let oMatch = aItems.find(item => item[sPropertyName].toLowerCase().trim() === sInput.toLowerCase().trim());

            // 2. Agar nahi mila, toh normalized fuzzy match try karein
            if (!oMatch) {
                oMatch = aItems.find(item => {
                    const sNormItem = item[sPropertyName].toLowerCase().trim().replace(/[^a-z0-9]/g, "");
                    return sNormItem.includes(sNormInput) || sNormInput.includes(sNormItem);
                });
                // console.log("oMatched item :", oMatch);
            }
            return oMatch;
        },



        _autoSelectSTD: function (sCode) {
            const oSTD = $C("adminsignUpSTD");
            const oModel = this.getView().getModel("AdminSignupModel");
            const oItem = oSTD.getItems().find(i => i.getAdditionalText() === sCode);
            if (oItem) {
                oSTD.setSelectedKey(oItem.getKey());
                oModel.setProperty("/STDCode", oItem.getKey());
            }
        },
        ADMIN_onChangeSTD: function (oEvent) {
            const oSTD = oEvent.getSource();
            let sValue = oSTD.getValue() || "";
            sValue = sValue.trim();
            const oMobile = $C("adminMobileNo");
            const oModel = this.getView().getModel("AdminSignupModel");
            if (!sValue) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("STD Code is required");
                oModel.setProperty("/STDCode", "");
                return;
            }
            const STD_REGEX = /^\+[1-9][0-9]*$/;
            if (!STD_REGEX.test(sValue)) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("Must start with + and have no leading zero (e.g., +91)");
                oModel.setProperty("/STDCode", "");
            } else {
                oSTD.setValueState("None");
                if (oMobile) {
                    oMobile.setMaxLength(sValue === "+91" ? 10 : 18);
                }
                oModel.setProperty("/STDCode", sValue);
            }
        },

        ADMIN_onMobileLiveChange: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;
            const oInput = oEvent.getSource();
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            const oSTD = $C("adminsignUpSTD");
            const stdRaw = oSTD?.getValue() || "";
            const std = stdRaw.startsWith("+") ? stdRaw : "+" + stdRaw;

            if (!val) return oInput.setValueState("None");

            if (!std || std === "+") {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("selectISDCodeFirst"));
                return;
            }
            const valid = utils._LCvalidateISDmobile(oInput, std);
            oInput.setValueState(valid ? "None" : "Error");
            if (!valid) {
                oInput.setValueStateText(
                    std === "+91" ?
                        this.i18nModel.getText("MSmobileNoValueStateIN") :
                        this.i18nModel.getText("MSmobileNoValueStateINT")
                );
            }
        },

        onAdminLiveValidate: function (oEvent) {
            const id = oEvent.getSource().getId();
            // Vendor name
            if (id.includes("adminVendorName")) return utils._LCvalidateName(oEvent);
            // Email
            if (id.includes("adminEmail")) return utils._LCvalidateEmail(oEvent);
            // Address
            if (id.includes("adminAddress")) return utils._LCvalidateMandatoryField(oEvent);
        },

        ADMIN_onChangeDOB: function (oEvent) {
            const oDatePicker = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");
            const raw = oDatePicker.getDateValue();
            if (!raw) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Date of birth is required");
                oModel.setProperty("/DOB", "");
                return;
            }
            const today = new Date();
            let age = today.getFullYear() - raw.getFullYear();
            const m = today.getMonth() - raw.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < raw.getDate())) {
                age--;
            }

            if (age < 0 || age > 100) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Age must be between 0 and 100");
                oModel.setProperty("/DOB", "");
                return;
            }
            oDatePicker.setValueState("None");
            const yyyy = raw.getFullYear();
            const mm = String(raw.getMonth() + 1).padStart(2, "0");
            const dd = String(raw.getDate()).padStart(2, "0");
            oModel.setProperty("/DOB", `${yyyy}-${mm}-${dd}`);
        },

        onSubmitAdminSignup: async function () {
            if (!this._validateAdminSignupFields()) return;
            const oModel = this.getView().getModel("AdminSignupModel");
            const data = oModel.getData();
            const oAdmin = data;

            const payload = {
                data: {
                    Salutation: oAdmin.Salutation,
                    UserName: oAdmin.VendorName.trim(),
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
            this.getBusyDialog();
            try {
                await this.ajaxCreateWithJQuery("HM_Login", payload);

                const sUsername = oAdmin.VendorName.trim();
                const sSalutation = $C("adminSalutation")?.getSelectedItem()?.getText() || "";
                // console.log(sUsername, sSalutation);

                MessageBox.success(
                    "Thank you " + sSalutation + " " + sUsername + ", for signing up.\n\n" +
                    "The team will review all submitted details and documents.\n\n" +
                    "Once verification is finished, an email will be shared along with the user credentials.\n\n" +
                    "Please check your inbox (or spam folder) for further updates.",
                    {
                        title: "Registration Submitted Successfully",
                        contentWidth: "500px",
                        emphasizedAction: MessageBox.Action.OK,
                        styleClass: "myUnifiedBtn",
                        onClose: () => {
                            this._oAdminSignup.close();
                        }
                }
                );

            } catch (err) {
                console.error("Admin signup error:", err);
                let sErrorMessage = "Registration failed. Please try again later.";

                if (err?.responseJSON?.message) {
                    sErrorMessage = err.responseJSON.message;
                } else if (err?.responseJSON?.error?.message?.value) {
                    sErrorMessage = err.responseJSON.error.message.value;
                } else if (err?.responseJSON?.error?.innererror?.errordetails?.length) {
                    sErrorMessage = err.responseJSON.error.innererror.errordetails[0].message || sErrorMessage;
                } else if (err?.responseText) {
                    try {
                        const oParsed = JSON.parse(err.responseText);
                        sErrorMessage =
                            oParsed?.message ||
                            oParsed?.error?.message?.value ||
                            oParsed?.error?.message ||
                            sErrorMessage;
                    } catch (e) {
                        sErrorMessage = err.responseText;
                    }
                } else if (err?.message) {
                    sErrorMessage = err.message;
                }

                MessageBox.error(sErrorMessage, {
                    title: "Registration Failed"
                });

            } finally {
                this.closeBusyDialog();
            }
        },



        onAdminFileSelect: function (oEvent) {
            const oUploader = $C("adminFileUploader");
            const oDocType = $C("adminDocType");
            const oModel = this.getView().getModel("AdminSignupModel");

            const file = oEvent.getParameter("files")?.[0];
            if (!file) return;
            // ---- REJECT DOC / DOCX (defensive) ----
            const forbiddenExt = ["doc", "docx"];
            const ext = (file.name || "").split(".").pop().toLowerCase();

            const forbiddenMimes = [
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ];

            if (forbiddenExt.includes(ext) || forbiddenMimes.includes(file.type)) {
                MessageToast.show(this.i18nModel.getText("filetypeNotAllowed") || "This file type is not allowed.");
                oUploader.clear();
                return;
            }


            const MAX_SIZE = 2 * 1024 * 1024; // 5 MB
            if (file.size > MAX_SIZE) {
                MessageToast.show(this.i18nModel.getText("filesizemustnotexceed5MB"));
                oUploader.clear();
                return;
            }
            const selectedDocType = oDocType.getSelectedKey();
            // 🔒 Guard 1: Doc type mandatory
            if (!selectedDocType) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectDocumentTypeFirst"));
                oUploader.clear();
                return;
            }
            // 🔒 Guard 2: Duplicate file check
            if (this._isDuplicateFile(file.name)) {
                MessageToast.show(this.i18nModel.getText("thisfilealreadyuploaded"));
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
                const previewUrl = URL.createObjectURL(file);
                docs.push({
                    FileName: file.name,
                    DocumentType: file.type, // MIME
                    VdocType: selectedDocType, // Aadhaar / PAN etc
                    File: base64,
                    Base64: base64,
                    PreviewUrl: previewUrl, // 🔥 NEW (for preview)
                    size: file.size
                });

                oModel.setProperty("/Documents", docs);
                // ✅ CLEAR ERROR STATE HERE (this is what you asked)
                const table = $C("adminAttachmentTable");
                table?.removeStyleClass("fileErrorHighlight");
                // 🔁 Reset doc type
                oModel.setProperty("/CurrentDocType", "");
                oUploader.clear();
                // Keep document types available for repeated uploads.
                oModel.setProperty("/DocTypeEnabled", true);
                oModel.setProperty("/UploadEnabled", false);
            };
            reader.readAsDataURL(file);
        },

        ADMIN_onChangeGender: function (oEvent) {
            const oSelect = oEvent.getSource();
            const key = oSelect.getSelectedKey();
            this.getView().getModel("AdminSignupModel").setProperty("/Gender", key);
            oSelect.setValueState(key ? "None" : "Error");
        },

        _resetAdminSignupForm: function () {
            const C = sap.ui.getCore().byId.bind(sap.ui.getCore());
            const oModel = this.getView().getModel("AdminSignupModel");

            // -------- MODEL RESET (SAFE WAY) --------
            ["/Salutation", "/VendorName", "/DOB", "/Gender", "/Email", "/Country", "/State", "/City", "/STDCode", "/Mobile", "/Address", "/CurrentDocType"].forEach(p => oModel.setProperty(p, ""));
            oModel.setProperty("/Documents", []);
            // -------- FORCE TABLE REFRESH --------
            const oTable = C("adminAttachmentTable");
            oTable?.getBinding("items")?.refresh(true);
            oTable?.removeStyleClass("fileErrorHighlight");
            // -------- RESET CONTROLS (IMPORTANT ORDER) --------
            ["adminSalutation", "adminVendorName", "adminDOB", "adminGender", "adminEmail", "adminsignUpCountry", "adminsignUpState", "adminsignUpCity", "adminsignUpSTD", "adminMobileNo", "adminAddress", "adminDocType"].forEach(id => {
                const c = C(id);
                if (!c) return;
                // ComboBox / Select
                c.setSelectedKey?.("");
                c.setValue?.("");
                // Inputs / DatePicker
                c.setValueState?.("None");
            });
            // -------- RESTORE DOCUMENT TYPE DROPDOWN --------
            const oDocType = $C("adminDocType");
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
                utils._LCstrictValidationSelect($C("adminSalutation")) &&
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
                MessageToast.show(this.i18nModel.getText("pleaseuploadatleastonedocument"));
                const table = C("adminAttachmentTable");
                table?.addStyleClass("fileErrorHighlight");
                return false;
            }
            return true;
        },

        _initAdminSignupModel: function () {
            const oModel = new JSONModel({
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
            }))
            return aPayloadDocs;
        },

        onAdminDeleteDoc: function (oEvent) {
            const oModel = this.getView().getModel("AdminSignupModel");
            const table = $C("adminAttachmentTable");
            const oCtx = oEvent.getParameter("listItem").getBindingContext("AdminSignupModel");
            const doc = oCtx.getObject(); // ✅ define first
            // 🧹 Cleanup preview blob
            if (doc.PreviewUrl) URL.revokeObjectURL(doc.PreviewUrl);

            const index = parseInt(oCtx.getPath().split("/").pop(), 10);
            const docs = oModel.getProperty("/Documents") || [];
            docs.splice(index, 1);
            oModel.setProperty("/Documents", docs);
            oModel.setProperty("/DocTypeEnabled", true);
            // 🔴 If no documents left → show error highlight
            if (docs.length === 0) table?.addStyleClass("fileErrorHighlight");
        },

        onAdminDocTypeSelected: function () {
            const uploader = $C("hiddenAdminUploader");
            if (uploader && uploader.openFileDialog) uploader.openFileDialog(); // <--- THIS opens Browse dialog
        },

        onAdminPreviewDoc: function (oEvent) {
            function autoDecodeBase64(b64) {
                if (!b64) return "";
                b64 = b64.replace(/\s/g, "");
                let last = b64;

                for (let i = 0; i < 5; i++) {
                    try {
                        if (
                            last.startsWith("iVB") || // PNG
                            last.startsWith("/9j") || // JPG
                            last.startsWith("JVBER") // PDF
                        ) {
                            return last;
                        }
                        last = atob(last);
                    } catch (e) {
                        break;
                    }
                }
                return last;
            }
            const oDoc = oEvent.getSource()
                .getBindingContext("AdminSignupModel")
                ?.getObject();

            if (!oDoc || !oDoc.File) return MessageBox.error(this.i18nModel.getText("nodocfound"));
            const sBase64 = autoDecodeBase64(oDoc.File);
            let sMimeType = "application/octet-stream";
            if (sBase64.startsWith("iVB")) {
                sMimeType = "image/png";
            } else if (sBase64.startsWith("/9j")) {
                sMimeType = "image/jpeg";
            } else if (sBase64.startsWith("JVBER")) {
                sMimeType = "application/pdf";
            }
            if (sMimeType.startsWith("image/")) {
                const sImageSrc = `data:${sMimeType};base64,${sBase64}`;
                if (!this._previewDialog) {
                    const oFlex = new sap.m.FlexBox({
                        width: "100%",
                        height: "100%",
                        renderType: "Div",
                        justifyContent: "Center",
                        alignItems: "Center",
                        items: [
                            new sap.m.Image({
                                id: this.createId("adminDocPreviewImage"),
                                densityAware: false,
                                width: "100%",
                                height: "100%",
                                style: "object-fit: contain; display:block;"
                            })
                        ]
                    });

                    this._previewDialog = new sap.m.Dialog({
                        title: oDoc.FileName || "Document Image",
                        contentWidth: "50%",
                        contentHeight: "60%",
                        draggable: true,
                        resizable: true,
                        contentPadding: "0rem",
                        horizontalScrolling: false,
                        verticalScrolling: true,
                        content: [oFlex],
                        beginButton: new sap.m.Button({
                            text: "Close",
                            press: () => this._previewDialog.close()
                        }),
                        afterClose: () => {
                            this._previewDialog.destroy();
                            this._previewDialog = null;
                        }
                    });
                    this.getView().addDependent(this._previewDialog);
                } else {
                    this._previewDialog.setTitle(oDoc.FileName || "Document Image");
                }
                this.byId("adminDocPreviewImage").setSrc(sImageSrc);
                this._previewDialog.open();
                return;
            }
            if (sMimeType === "application/pdf") {
                if (!this._previewDialog) {
                    this._previewDialog = new sap.m.Dialog({
                        title: oDoc.FileName || "Document Preview",
                        stretch: true,
                        draggable: true,
                        resizable: true,
                        contentWidth: "50%",
                        contentHeight: "50%",
                        horizontalScrolling: true,
                        verticalScrolling: false,
                        contentPadding: "0rem",
                        endButton: new sap.m.Button({
                            text: "Close",
                            press: () => {
                                if (this._previewUrl) {
                                    URL.revokeObjectURL(this._previewUrl);
                                    this._previewUrl = null;
                                }
                                this._previewDialog.close();
                            }
                        }),
                        afterClose: () => {
                            this._previewDialog.destroy();
                            this._previewDialog = null;
                        }
                    });
                    this.getView().addDependent(this._previewDialog);
                }
                this._previewDialog.removeAllContent();
                const byteChars = atob(sBase64);
                const byteArrays = [];
                for (let offset = 0; offset < byteChars.length; offset += 512) {
                    const slice = byteChars.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                const blob = new Blob(byteArrays, {
                    type: sMimeType
                });
                if (this._previewUrl) URL.revokeObjectURL(this._previewUrl);

                this._previewUrl = URL.createObjectURL(blob);
                this._previewDialog.addContent(
                    new sap.ui.core.HTML({
                        sanitizeContent: false,
                        content: `
            <div style="width:100%; height:100%; overflow:hidden;">
                <iframe
                    src="${this._previewUrl}"
                    style="width:100%; height:calc(100vh - 100px); border:none; display:block;">
                </iframe>
            </div>
        `
                    })
                );
                this._previewDialog.open();
                return;
            }
            MessageToast.show("Preview not supported.");
        },

        onAdminChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = $C("adminGender");
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
            } else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }
            // Dr. → manual gender selection

            // ✅ Strict validation (CONTROL, not event)
            utils._LCstrictValidationSelect(oSalutation);
        },
        ADMIN_onAddressChange: function (oEvent) {
            utils._LCvalidateAddress(oEvent.getSource())
        },

        MPonAddressChange: function (oEvent) {
            utils._LCvalidateAddress(oEvent.getSource())
        },

        onNameInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateName(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onAddressClick: function () {
            try {
                let oHostelModel = this._oRoomDetailFragment ? this._oRoomDetailFragment.getModel("HostelModel") : this.oHostelModel;
                if (!oHostelModel) return MessageToast.show("Location data not available.");
                const sGeoUrl = (oHostelModel.getProperty("/GeoLocation") || "").trim();
                if (!sGeoUrl || sGeoUrl === "null" || sGeoUrl === "undefined") {
                    return MessageToast.show("Geo Location is not available");
                }
                const urlPattern = /^https:\/\/[^ "]+(\.[a-z]{2,})/i;
                if (!urlPattern.test(sGeoUrl)) {
                    return MessageToast.show("Invalid Geo Location link");
                }

                window.open(sGeoUrl, "_blank");
            } catch (err) {
                MessageToast.show("Error opening maps.");
            }
        },

        onSupportRequest: function () {

            if (!this._supportRequestDialog) {

                sap.ui.core.Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.ui.com.project1.fragment.SupportRequest",
                    controller: this
                }).then(function (oDialog) {

                    this._supportRequestDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();

                    this._supportRequestDialog.attachAfterClose(() => {
                 
                    this.HF_onCancelButtonPress();
                });

                }.bind(this));

            } else {
                this._supportRequestDialog.open();
            }

        },
       HF_onCancelButtonPress: function () {

    const oView = this.getView();

    // 1️⃣ Clear model data
    const oSupportModel = oView.getModel("SupportModel");
    if (oSupportModel) {
        oSupportModel.setData({
            IssueName: "",
            IssueType: "",
            IssueDescription: "",
            RaisedBy: "",
            Email: ""
        });
    }

    // 2️⃣ Clear uploaded images
    const oUploaderData = oView.getModel("UploaderData");
    if (oUploaderData) {
        oUploaderData.setProperty("/attachments", []);
    }

    // 3️⃣ Clear tokens
    const oTokenModel = oView.getModel("tokenModel");
    if (oTokenModel) {
        oTokenModel.setProperty("/tokens", []);
    }

    // 4️⃣ Reset ValueState
    const aFields = [
        "SR_id_IssueName",
        "SR_id_IssueType",
        "SR_id_IssueDescription",
        "SR_id_RaisedBy",
        "SR_id_Email"
    ];

    aFields.forEach(id => {
        const oControl = sap.ui.getCore().byId(oView.createId(id));
        if (oControl) {
            oControl.setValueState("None");
        }
    });

    // 5️⃣ Clear file uploader
    const oUploader = sap.ui.getCore().byId(oView.createId("HFF_id_FileUploader1"));
    if (oUploader) {
        oUploader.clear();
    }

    // 6️⃣ Close dialog
    this._supportRequestDialog.close();

},
        onIssuenamechanges: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },
        onFileSizeExceed: function (oEvent) {
    const oFileUploader = oEvent.getSource();
    const sFileName = oEvent.getParameter("fileName");

    sap.m.MessageToast.show(`${sFileName} exceeds 2 MB size limit.`);
},
       onSupportrequestChange: function (oEvent) {

    const oFiles = oEvent.getParameter("files");
    if (!oFiles || oFiles.length === 0) return;

    const oView = this.getView();
    const oUploaderData = oView.getModel("UploaderData");
    const oTokenModel = oView.getModel("tokenModel");

    let aAttachments = oUploaderData.getProperty("/attachments") || [];
    let aTokens = oTokenModel.getProperty("/tokens") || [];
if (aAttachments.length + oFiles.length > 3) {
                MessageToast.show("You can upload maximum 3 images only");
                return;
            }

    Array.from(oFiles).forEach((oFile) => {

        // Check duplicate file name
        const bDuplicate = aAttachments.some(file => file.filename === oFile.name);
        if (bDuplicate) {
            MessageToast.show("This file is already uploaded and cannot be uploaded again");
            return;
        }
        // File type validation
        if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
            MessageToast.show("Only JPG, JPEG, PNG allowed");
            return;
        }


        const oReader = new FileReader();

        oReader.onload = (e) => {

            const sBase64 = e.target.result.split(",")[1];

            aAttachments.push({
                filename: oFile.name,
                fileType: oFile.type,
                content: sBase64
            });

            aTokens.push({
                key: oFile.name,
                text: oFile.name
            });

            oUploaderData.setProperty("/attachments", aAttachments);
            oTokenModel.setProperty("/tokens", aTokens);

        };

        oReader.readAsDataURL(oFile);

    });

    oEvent.getSource().clear();

},
        onTokenDelete: function (oEvent) {

            const aDeletedTokens = oEvent.getParameter("tokens");

            if (!aDeletedTokens || aDeletedTokens.length === 0) return;

            const oView = this.getView();
            const oUploaderData = oView.getModel("UploaderData");
            const oTokenModel = oView.getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            aDeletedTokens.forEach((oToken) => {

                const sKey = oToken.getKey();

                aAttachments = aAttachments.filter(file => file.filename !== sKey);
                aTokens = aTokens.filter(token => token.key !== sKey);

            });

            oUploaderData.setProperty("/attachments", aAttachments);
            oTokenModel.setProperty("/tokens", aTokens);

        },
        onSupportSubmit: async function () {

            const oView = this.getView();
            const oSupportModel = oView.getModel("SupportModel").getData();
            const oUploaderData = oView.getModel("UploaderData");

            const aAttachments = this.getView()
                .getModel("UploaderData")
                .getProperty("/attachments") || [];

            let photoPayload = {
                Photo1: "",
                Photo1Name: "",
                Photo1Type: "",
                Photo2: "",
                Photo2Name: "",
                Photo2Type: "",
                Photo3: "",
                Photo3Name: "",
                Photo3Type: ""
            };

            aAttachments.forEach((file, index) => {

                const i = index + 1;

                if (i <= 3) {
                    photoPayload[`Photo${i}`] = file.content;
                    photoPayload[`Photo${i}Name`] = file.filename;
                    photoPayload[`Photo${i}Type`] = file.fileType;
                }

            });
            var isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("SR_id_IssueName")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("SR_id_IssueType")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("SR_id_IssueDescription")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("SR_id_RaisedBy")), "ID") &&
                utils._LCvalidateEmail(sap.ui.getCore().byId(oView.createId("SR_id_Email")), "ID")
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // IMAGE VALIDATION
            if (!aAttachments || aAttachments.length === 0) {
                MessageToast.show("Please upload at least one image.");
                return;
            }

            // if (aAttachments.length > 3) {
            //     MessageToast.show("You can upload maximum 3 images only.");
            //     return;
            // }

            const todayDate = new Date().toISOString().split("T")[0];

            const data = {
                IssueName: oSupportModel.IssueName,
                IssueType: oSupportModel.IssueType,
                IssueDescription: oSupportModel.IssueDescription,
                RaisedBy: oSupportModel.RaisedBy,
                Email: oSupportModel.Email,
                CreatedDate: todayDate,
                Status: "Open",
                ...photoPayload
            };
            const payload = {
                data: data
            };
            this.getBusyDialog();
            await this.ajaxCreateWithJQuery("HM_Support", payload);
            this.closeBusyDialog()
            MessageToast.show("Support request submitted successfully");

          this.HF_onCancelButtonPress()
        },

        onissuetypechanges: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent)
        },
        ondescriptionchnages: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
        },
        onchangesRaisedby: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
        },
        onEmailchange: function (oEvent) {
            utils._LCvalidateEmail(oEvent)
        },
        onExit: function () {

    if (this._imageInterval) {
        clearInterval(this._imageInterval);
    }

}
    });
});
