sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment"
], function (BaseController, JSONModel, MessageToast, MessageBox, utils, Formatter, Filter, FilterOperator, Fragment) {
    "use strict";
 
    const $C = (id) => sap.ui.getCore().byId(id);
    // const $V = (id) => $C(id)?.getValue()?.trim() || "";
    this._otpResendInterval = null;
    this._otpValidityInterval = null;

    /* ------------------------------------------------------------------ */
    /*  Vendor registration constants                                      */
    /* ------------------------------------------------------------------ */
    var VR_MAX_BYTES     = 400 * 1024,
        VR_MIN_AGE       = 18,
        VR_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"],
        VR_ALLOWED_EXT   = /\.(jpe?g|png|pdf)$/i;

    return BaseController.extend("sap.ui.com.project1.controller.Hostel", {
        _isProfileRequested: false,
        Formatter: Formatter,
        onInit: function () {

            // The advertisement panel under the filter bar binds to this model,
            // so it exists (empty) before the first render and fills in once
            // the pictures arrive.
            this._adCarouselPauseResumeHandlers = [];
            this._setupAdvertisementModel([]);

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

            this._initVendorRegistration();
      
                  
        },

        onBeforeRendering: function () {
            // ToolHeader hides its native popover pointer on phones by default.
            const oHeaderPopover = this.byId("hostelTopHeader").getAggregation("_popover");
            if (oHeaderPopover) {
                oHeaderPopover.setShowArrow(true);
            }

            // The signup date picker is calendar-only. The delegate has to be
            // registered before the control renders, otherwise its
            // onAfterRendering hook never runs.
            this._makeAdminDobReadOnly();
        },

        _makeAdminDobReadOnly: function () {
            const oView = this.getView();
            const oDOB = oView.byId("adminDOB");

            // _FragmentDatePickersReadOnly registers a render delegate and a
            // click handler, so it must run once per picker instance.
            if (!oDOB || this._vrDobPicker === oDOB) return;

            this._vrDobPicker = oDOB;
            this._FragmentDatePickersReadOnly([oView.createId("adminDOB")]);
        },

        onAfterRendering: function () {
            this._startAllCarouselsAutoSlide(3000);
            this._initAdminSignupControls();
            this._makeAdminDobReadOnly();
            this._hookAdminDropZone();
            this._vrHookPropertyTabs();
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
                        // The lookup can finish after the country/state/city models
                        // have loaded. Re-apply the prefill so a late location still
                        // fills the address in.
                        this._applyGeoPrefill();
                    }

                } catch (error) { }
            }, 1200); // 1 request per second (safe for Nominatim)
        },
        _updateStaysData: function (oResourceBundle) {
    var aStays = [
        { 
            id: "Hotels", 
            badge: oResourceBundle.getText("stayHotels"), 
            icon: "sap-icon://bed",
            blurb: oResourceBundle.getText("blurbHotels"),
            Subtitle: oResourceBundle.getText("FindYourStayMakeEveryJourneyComfortable"),
            best: [oResourceBundle.getText("tagTravel"), oResourceBundle.getText("tagBusinessTrips"), oResourceBundle.getText("tagGetaways"), oResourceBundle.getText("tagFamilies")],
         see: [
    {
        title: oResourceBundle.getText("seeRoomTypesAndPhotosTitle"),
        description: oResourceBundle.getText("seeRoomTypesAndPhotosDesc")
    },
    {
        title: oResourceBundle.getText("seeFacilitiesAndAmenitiesTitle"),
        description: oResourceBundle.getText("seeFacilitiesAndAmenitiesDesc")
    },
    {
        title: oResourceBundle.getText("seeStartingPriceTitle"),
        description: oResourceBundle.getText("seeStartingPriceDesc")
    },
    {
        title: oResourceBundle.getText("seeCancellationPolicyTitle"),
        description: oResourceBundle.getText("seeCancellationPolicyDesc")
    }
]
        },
        { 
            id: "Hostels", 
            badge: oResourceBundle.getText("stayHostels"), 
            icon: "sap-icon://home-share",
            blurb: oResourceBundle.getText("blurbHostels"),
            Subtitle: oResourceBundle.getText("AffordableStaysGreatConnections"),

            best: [oResourceBundle.getText("tagStudents"), oResourceBundle.getText("tagSoloTravellers"), oResourceBundle.getText("tagBudgetStays"), oResourceBundle.getText("tagShortVisits")],
              see: [
    {
        title: oResourceBundle.getText("seeRoomTypesAndPhotosTitlehotels"),
        description: oResourceBundle.getText("seeRoomTypesAndPhotosDeschotels")
    },
    {
        title: oResourceBundle.getText("seeFacilitiesAndAmenitiesTitle"),
        description: oResourceBundle.getText("seeFacilitiesAndAmenitiesDeschotels")
    },
    {
        title: oResourceBundle.getText("seeStartingPriceTitle"),
        description: oResourceBundle.getText("seeStartingPriceDeschotels")
    },
    {
        title: oResourceBundle.getText("seeCancellationPolicyTitlehotels"),
        description: oResourceBundle.getText("seeCancellationPolicyDeschotels")
    }
]
        },
        { 
            id: "PG", 
            badge: oResourceBundle.getText("stayPG"), 
            icon: "sap-icon://home",
            blurb: oResourceBundle.getText("blurbPG"),
            Subtitle: oResourceBundle.getText("FeelatHomeStayforLonger"),
            best: [oResourceBundle.getText("tagStudents"), oResourceBundle.getText("tagWorkingProfessionals"), oResourceBundle.getText("tagLongerStays"), oResourceBundle.getText("tagRelocating")],
                 see: [
    {
        title: oResourceBundle.getText("seeRoomTypesAndPhotosTitlehotels"),
        description: oResourceBundle.getText("seeRoomTypesAndPhotosDescPG")
    },
    {
        title: oResourceBundle.getText("seeFacilitiesAndAmenitiesTitlePG"),
        description: oResourceBundle.getText("seeFacilitiesAndAmenitiesDescPG")
    },
    {
        title: oResourceBundle.getText("seeStartingPriceTitlePG"),
        description: oResourceBundle.getText("seeStartingPriceDescPG")
    },
    {
        title: oResourceBundle.getText("seeCancellationPolicyTitlePG"),
        description: oResourceBundle.getText("seeCancellationPolicyDescPG")
    }
]
        },
        { 
            id: "Service Apartments", 
            badge: oResourceBundle.getText("stayServiceApartments"), 
            icon: "sap-icon://building",
            blurb: oResourceBundle.getText("blurbServiceApartments"),
            Subtitle: oResourceBundle.getText("TheComfortofHomeTheFreedomtoStay"),

            best: [oResourceBundle.getText("tagFamilies"), oResourceBundle.getText("tagGroups"), oResourceBundle.getText("tagLongerVisits"), oResourceBundle.getText("tagWorkTrips")],
                  see: [
    {
        title: oResourceBundle.getText("seeRoomTypesAndPhotosTitleapp"),
        description: oResourceBundle.getText("seeRoomTypesAndPhotosDescapp")
    },
    {
        title: oResourceBundle.getText("seeFacilitiesAndAmenitiesTitle"),
        description: oResourceBundle.getText("seeFacilitiesAndAmenitiesDescapp")
    },
    {
        title: oResourceBundle.getText("seeStartingPriceTitle"),
        description: oResourceBundle.getText("seeStartingPriceDescapp")
    },
    {
        title: oResourceBundle.getText("seeCancellationPolicyTitle"),
        description: oResourceBundle.getText("seeCancellationPolicyDescapp")
    }
]
        },
        { 
            id: "Rented Apartments", 
            badge: oResourceBundle.getText("stayRentedApartments"), 
            icon: "sap-icon://key",
            blurb: oResourceBundle.getText("blurbRentedApartments"),
            Subtitle: oResourceBundle.getText("FindYourSpaceMakeItFeelLikeHome"),

            best: [oResourceBundle.getText("tagLongTermStays"), oResourceBundle.getText("tagFamilies"), oResourceBundle.getText("tagRelocating"), oResourceBundle.getText("tagWorkingProfessionals")],
                        see: [
    {
        title: oResourceBundle.getText("seeRoomTypesAndPhotosTitleRE"),
        description: oResourceBundle.getText("seeRoomTypesAndPhotosDescRE")
    },
    {
        title: oResourceBundle.getText("seeFacilitiesAndAmenitiesTitle"),
        description: oResourceBundle.getText("seeFacilitiesAndAmenitiesDescRE")
    },
    {
        title: oResourceBundle.getText("seeStartingPriceTitle"),
        description: oResourceBundle.getText("seeStartingPriceDescRE")
    },
    {
        title: oResourceBundle.getText("seeCancellationPolicyTitleRE"),
        description: oResourceBundle.getText("seeCancellationPolicyDescRE")
    }
]
        }
    ];

    var oViewModel = this.getView().getModel("view");
    if (oViewModel) {
        // If model already exists, update its properties
        oViewModel.setProperty("/staysList", aStays);
        
        // Also update the current selected stay to match the new language
        var sCurrentSelectedId = oViewModel.getProperty("/selectedId") || "Hotels";
        var oUpdatedCurrentStay = aStays.find(function(stay) {
            return stay.id === sCurrentSelectedId;
        });
        oViewModel.setProperty("/currentStay", oUpdatedCurrentStay);
    } else {
        // Create the JSONModel for the first time if onRouteMatched is calling it
        oViewModel = new JSONModel({
            selectedId: "Hotels",
            currentStay: aStays[0],
            staysList: aStays
        });
        this.getView().setModel(oViewModel, "view");
    }
},
_getResourceBundle: function () {
    var sLocale = localStorage.getItem("selectedLanguage") || "en";

    // Set core configuration language
    sap.ui.getCore().getConfiguration().setLanguage(sLocale);

    // Ensure the i18n model exists and uses the selected locale
    var oI18nModel = this.getView().getModel("i18n");
    
    if (!oI18nModel || oI18nModel.getResourceBundle().sLocale !== sLocale) {
        oI18nModel = new sap.ui.model.resource.ResourceModel({
            bundleName: "sap.ui.com.project1.i18n.i18n", // Replace with your app namespace
            bundleLocale: sLocale
        });
        this.getView().setModel(oI18nModel, "i18n");
    }

    return oI18nModel.getResourceBundle();
},
Topproperty:async function (sPropertyType) {
     const convertBase64ToImage = (base64String, fileType) => {
                    if (!base64String) return "./image/Fallback.png";

                    let sBase64 = base64String.replace(/\s/g, "");

                    if (sBase64.startsWith("data:image")) return sBase64;

                    const mimeType = fileType || "image/jpeg";
                    return `data:${mimeType};base64,${sBase64}`;
                };
              var oVisibilityModel = new JSONModel({ NoData: false, ShowViewMore: false });
                this.getView().setModel(oVisibilityModel, "TopModel");
                 let response = await this.ajaxReadWithJQuery("HM_GetBranchImage", {
                        City: "Kalaburagi",
                        PropertyType: sPropertyType || "",
                        top: 1,
                        skip: 0,
                        flag: "true"
                    });
             var aBranchesData = response?.data || [];


aBranchesData = aBranchesData.map((branch) => ({
                       BranchID: branch.BranchID,
                        Name: branch.Name,
                        City: branch.City,
                        Address: branch.Address,
                        PropertyType: branch.PropertyType,
                        LandMark: branch.LandMark,
                        Country: branch.Country,
                        GSTIN: branch.GSTIN,
                        CheckInTime: branch.CheckinTime,
                        CheckOutTime: branch.CheckoutTime,
                        GeoLocation: branch.GeoLocation,
                        TotalFeedbacks: branch.TotalFeedbacks,
                        AverageRating: branch.AverageRating,
                        StartingPrice: branch.StartingPrice,
                        Currency: branch.Currency,
    Image: convertBase64ToImage(
        branch.Attachment,
        branch.AttachmentType
    )
}));

            oVisibilityModel.setProperty("/Branches", aBranchesData)
             if(aBranchesData.length>0){
              oVisibilityModel.setProperty("/Branch", false)
             }else{
              oVisibilityModel.setProperty("/Branch", true)
             }

},

        _onRouteMatched: async function () {
               await this.Topproperty("Hotel")

         // Inside your Controller or Component initialization where i18n bundle is available:
var oResourceBundle = this._getResourceBundle();

this._updateStaysData(oResourceBundle);

            this._applyHostelLanguage(localStorage.getItem("selectedLanguage") || "en");
            var bBusyOnLoad = sessionStorage.getItem("hostelBusyOnLoad") === "true";
            sessionStorage.removeItem("hostelBusyOnLoad");
            if (bBusyOnLoad) {
                this._bBusyFromBooking = true;
                this.getBusyDialog();
            }
            var LoginFunction = await this.commonLoginFunction("LoginPage");
            if (!bBusyOnLoad) {
                this.closeBusyDialog();
                this._forceCloseAllBusyDialogs();
            }

            // The advertisements are read from the service, which needs the
            // login model of the component. That model only exists once the
            // route is matched, so the pictures are loaded here and not in
            // onInit.
            this._loadAdvertisements();
            const sStoredTab = sessionStorage.getItem("homePageReturnTab") || "idHome";
            const oTabHeader = this.byId("mainTabHeader");
            if (oTabHeader) oTabHeader.setSelectedKey(sStoredTab);

            const oNavContainer = this.byId("pageContainer");
            if (oNavContainer) {
                const oPage = this.byId(sStoredTab);
                if (oPage) oNavContainer.to(oPage);
            }

            if (sStoredTab === "idRooms") {
                setTimeout(async () => {
                    this.cityuse = true
                    await this._loadRoomsPageData();
                }, 300);

            }

            sessionStorage.removeItem("homePageReturnTab");

            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

            // Refresh vendor labels after route localization without resetting the form.
            this._initVendorRegistration();
            this._initAdminSignupControls();
            if (sStoredTab === "idVendor") {
                this._setVendorScope(true);
                this.onAdminLoadLocations();
                this._vrScrollToTop();
            }

            this.iTop = 4; // records per load
            this.iSkip = 0; // starting index

            this.flag = false
            this.roomtype = false

            if (!this.getView().getModel("VisibilityModel")) {
                this.getView().setModel(new JSONModel({ NoData: false, ShowViewMore: false }), "VisibilityModel");
            }
            this.getOwnerComponent().setModel("VisibilityModel");
            const oView = this.getView();
            //  Disable controls initially
            this.byId("id_Branch").setEnabled(true);
            this.byId("id_Area").setEnabled(true);
            this.byId("id_Pricerange").setEnabled(true);
            this.byId("id_Roomtype").setEnabled(true);
            this.byId("id_PropertyType").setEnabled(true);

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

            this.onAfterAnimate()

            // Fallback: ensure the booking busy dialog is closed even if the home
            // image preload never reports completion.
            if (bBusyOnLoad) {
                setTimeout(function () {
                    this._bBusyFromBooking = false;
                    this.closeBusyDialog();
                }.bind(this), 3000);
            }
            
        },
  onStayTypePress:async function (oEvent) {
var oButton = 
    typeof oEvent?.getSource === "function"
        ? oEvent.getSource()
        : null;

var sSelectedId = oButton?.data("stayId") || "Hotels";

    var oModel = this.getView().getModel("view");
    var aStays = oModel.getProperty("/staysList");

    // 1. Find the selected stay details from your dynamic array
    var oSelectedStay = aStays.find(function(stay) {
        return stay.id === sSelectedId;
    });

    if (oSelectedStay) {
        oModel.setProperty("/selectedId", sSelectedId);
        oModel.setProperty("/currentStay", oSelectedStay);
    }

    // 2. Clear 'selected-stay-btn' class from ALL buttons first
    var aButtons = [
        this.byId("btnHotels"),
        this.byId("btnHostels"),
        this.byId("btnPG"),
        this.byId("btnServiceApartments"),
        this.byId("btnRentedApartments")
    ];

    aButtons.forEach(function(btn) {
        if (btn) {
            btn.removeStyleClass("selected-stay-btn");
        }
    });

    // 3. Add 'selected-stay-btn' ONLY to the currently clicked button
    oButton?.addStyleClass("selected-stay-btn");
        if(sSelectedId==="Hostels"){
                sSelectedId="Hostel"
            }else if(sSelectedId==="Hotels"){
                this.getView().byId("btnHotels").toggleStyleClass("selected-stay-btn", true)
                sSelectedId="Hotel"

            }else if(sSelectedId==="Service Apartments"){
                sSelectedId="Service Apartment"

            }else if(sSelectedId==="Rented Apartments"){
                sSelectedId="Rented Apartment"

            }
            this.getBusyDialog()
          await  this.Topproperty(sSelectedId)
            this.closeBusyDialog()
},


        onBrowseHotelsPress:async function () {
            var sCurrentId = this.getView().getModel("view").getProperty("/selectedId");

            if(sCurrentId==="Hostels"){
                sCurrentId="Hostel"
            }else if(sCurrentId==="Hotels"){
                sCurrentId="Hotel"

            }else if(sCurrentId==="Service Apartments"){
                sCurrentId="Service Apartment"

            }else if(sCurrentId==="Rented Apartments"){
                sCurrentId="Rented Apartment"

            }
            // Add your navigation or action logic here
              var oTabHeader = this.getView().byId("mainTabHeader");

        oTabHeader.setSelectedKey("idRooms");

          this.key="idRooms"
          this.PropertyType=sCurrentId
          this.isInitialLoad=false

          await this.onTabSelect()
          this.byId("id_PropertyType").setSelectedKeys([sCurrentId]);
          

        },
        onAfterAnimate: function () {
            var oHome = this.byId("idHome");
            var oComponent = this.getOwnerComponent();

            oHome.setBusy(true);

            var oInterval = setInterval(function () {
                if (oComponent._imagesLoaded) {
                    clearInterval(oInterval);

                    var aImages = oComponent._aPreloadedImages;
                    this._homeSliderIndex = 0;

                    // Apply base styling and CSS transition for background-image
                    oHome.$().css({
                        "background-image": "url('" + aImages[0] + "')",
                        "background-size": "cover",
                        "background-position": "center",
                        "background-repeat": "no-repeat",
                        "transition": "background-image 0.8s ease-in-out" // Handles the smooth fade
                    });

                    setTimeout(function () {
                        oHome.setBusy(false);
                        if (this._bBusyFromBooking) {
                            this._bBusyFromBooking = false;
                            this.closeBusyDialog();
                        }
                    }.bind(this), 300);

                    // Clear any existing interval to prevent memory leaks
                    if (this._imageInterval) {
                        clearInterval(this._imageInterval);
                    }

                    // Slider
                    this._imageInterval = setInterval(function () {

                        this._homeSliderIndex = (this._homeSliderIndex + 1) % aImages.length;

                        var sNextImage = "url('" + aImages[this._homeSliderIndex] + "')";

                        // Preload image before applying
                        var img = new Image();
                        img.src = aImages[this._homeSliderIndex];

                        img.onload = function () {

                            var $home = oHome.$();

                            // Force smooth repaint trick

                            // Apply new background
                            $home.css({
                                "background-image": sNextImage,
                                "background-size": "cover",
                                "background-position": "center",
                                "background-repeat": "no-repeat"
                            });

                        };

                    }.bind(this), 6000); ////6000
                }
            }.bind(this), 50);
        },

        /* â”€â”€ Home image slider pause / resume on input focus â”€â”€ */

        _stopHomeImageSlider: function () {
            if (this._imageInterval) {
                clearInterval(this._imageInterval);
                this._imageInterval = null;
            }
        },

        _startHomeImageSlider: function () {
            var oTabHeader = this.byId("mainTabHeader");
            if (oTabHeader && oTabHeader.getSelectedKey() !== "idHome") return;

            var oHome = this.byId("idHome");
            var oComponent = this.getOwnerComponent();
            if (!oHome || !oComponent || !oComponent._imagesLoaded) return;

            var aImages = oComponent._aPreloadedImages;
            if (!aImages || aImages.length <= 1) return;

            if (this._imageInterval) {
                clearInterval(this._imageInterval);
            }

            this._homeSliderIndex = this._homeSliderIndex || 0;
            this._imageInterval = setInterval(function () {
                this._homeSliderIndex = (this._homeSliderIndex + 1) % aImages.length;
                var sNextImage = "url('" + aImages[this._homeSliderIndex] + "')";

                var img = new Image();
                img.src = aImages[this._homeSliderIndex];
                img.onload = function () {
                    var $home = oHome.$();
                    if ($home) {
                        $home.css({
                            "background-image": sNextImage,
                            "background-size": "cover",
                            "background-position": "center",
                            "background-repeat": "no-repeat"
                        });
                    }
                };
            }.bind(this), 6000); ////6000
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

            MessageToast.show(this.i18nModel.getText("expiredPleaseresendOTP"));
        },

        onUserlivechange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        _populateUniqueFilterValuesBranch: function (data) {
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
                console.error("âŒ Facility load error:", err);
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

                        // âœ… Attach models
                        fragment.setModel(oHostelModel, "HostelModel");
                        fragment.setModel(oView.getModel("FacilityModel"), "FacilityModel");

                        // âœ… THIS WAS THE MISSING LINE
                        const bPhone = sap.ui.Device.system.phone;
                        fragment.setContentWidth(bPhone ? "100%" : "70%");

                        // âœ… Open dialog AFTER models are set
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
                console.log("âŒ Amenity load error:", err);
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
                "Lounge Areas": "../image/LoungeArea.jpg",
                "Swimming Pool": "../image/pool.png"
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
     onfootertabselect: function () {
    var oTabHeader = this.getView().byId("mainTabHeader");

    oTabHeader.setSelectedKey("idRooms");

          this.key="idRooms"
          this.onTabSelect()
},
  onfooterhometabselect: function () {
    var oTabHeader = this.getView().byId("mainTabHeader");

    oTabHeader.setSelectedKey("idHome");

          this.key="idHome"
          this.onTabSelect()
},
 onfootercontacttabselect: function () {
    var oTabHeader = this.getView().byId("mainTabHeader");

    oTabHeader.setSelectedKey("idContact");

          this.key="idContact"
          this.onTabSelect()
},
        onTabSelect: async function (oEvent) {
            const oView = this.getView();
            let oVisibilityModel = oView.getModel("VisibilityModel");
            if (!oVisibilityModel) {
                oVisibilityModel = new JSONModel({ NoData: false, ShowViewMore: false });
                oView.setModel(oVisibilityModel, "VisibilityModel");
            }
            oVisibilityModel.setProperty("/Branches", {})
            oVisibilityModel.setProperty("/ShowViewMore", false);

            const sKey = oEvent? oEvent.getParameter("item").getKey() :  this.key;

            // A completed registration is a one-time confirmation. Leaving the
            // vendor tab clears it, so coming back shows a blank form instead of
            // the old success panel.
            if (sKey !== "idVendor") {
                this._dismissAdminSignupSuccess();
            }

            // The vendor form's dropdown popups are rendered into the static area
            // (outside the view), so a class on <body> is what lets the vendor
            // stylesheet style them without touching the rest of the app.
            this._setVendorScope(sKey === "idVendor");
            this._navigateTo(sKey);
            const page = this.byId(sKey);
            if (page && page.scrollTo) page.scrollTo(0, 0);

            this.flag = true;
            this.iTop = 4;
            this.iSkip = 0;
            this.roomtype = true;

            const oFooterModel = this.getView().getModel("FooterModel");
            if (sKey === "idRooms") {
                // The advertisement carousel only gets its pictures when the
                // tab is on screen, so the slide is (re)armed here.
                this._iAdCarouselRetries = 0;
                this._startAdCarouselAutoSlide();

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
                var BranchNewData = this.getOwnerComponent().getModel("branchModel1");


                let aData = oModel.getData();
                if (BranchNewData) {
                    // this.byId("idBedTypeFlex").setBusy(true);
                    this.byId("id_Branch").setBusy(true).setValueState("None");
                    this.byId("id_Area").setBusy(true);
                    this.byId("id_Roomtype").setBusy(true)
                    this.byId("id_PropertyType").setBusy(true)
                    this.byId("id_Pricerange").setBusy(true)



                    try {
                        const response = await this.ajaxReadWithJQuery("HM_BranchData", "");
                        aData = response?.data || [];
                        this.Branchlength = aData.length;

                        this.getOwnerComponent().getModel("sBRModel").setData(aData)

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

                        // âœ… Handle No Data
                        if (!aData || aData.length === 0) {
                            oVisibilityModel.setProperty("/NoData", true);
                        } else {
                            oVisibilityModel.setProperty("/NoData", false);
                        }
                    } finally {
                        this.closeBusyDialog();
                    }
                }
                this.cityuse = false
                await this._loadRoomsPageData();
            } else {
                oFooterModel.setProperty("/showGlobalFooter", true);
                oFooterModel.setProperty("/showRoomsFooter", false);
                 this.onStayTypePress("");

            }
            if (sKey === "idContact") {
                if (this._imageInterval) {
                    clearInterval(this._imageInterval);
                }
            }

            if (sKey === "idVendor") {
                if (this._imageInterval) {
                    clearInterval(this._imageInterval);
                }
                this._vrHookPropertyTabs();
                this._initAdminSignupControls();
                this.onAdminLoadLocations();
                this._hookAdminDropZone();
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
            this._stopHomeImageSlider();

            this._vrExited = true;
            // The vendor scope marker must not survive the view.
            this._setVendorScope(false);
            // A registration may still be in flight; never leave the shared busy
            // dialog open on the next view.
            this.closeBusyDialog();
            this._adminUploadTask = null;
            if (this._adminFileReader && this._adminFileReader.readyState === 1) {
                this._adminFileReader.abort();
            }
            this._clearAdminSignupDocuments();
            this.onClosePreview();
            this.getView().detachModelContextChange(this._initAdminSignupControls, this);
            if (this._adminSignupModel) {
                this._adminSignupModel.detachPropertyChange(this._updateAdminSignupProgress, this);
                this._adminSignupModel.setProperty("/Submitting", false);
            }
            (this._adminGeoBindings || []).forEach(function (oEntry) {
                if (oEntry.binding) { oEntry.binding.destroy(); }
            });
            this._adminGeoBindings = [];
            if (this._adminDropZone) {
                this._adminDropZone.detachBrowserEvent("dragenter dragover dragleave drop", this._adminDropHandler, this);
                this._adminDropZone = null;
            }
            if (this._adminSuccessBox) {
                this._adminSuccessBox.removeEventDelegate(this._adminSuccessDelegate);
                this._adminSuccessBox = null;
            }
            if (this._vrTypeTabs) {
                this._vrTypeTabs.removeEventDelegate(this._vrTypeDelegate);
                this._vrTypeTabs = null;
                this._vrTypeDelegate = null;
            }
            if (this._vrSwapTimer) {
                clearTimeout(this._vrSwapTimer);
                this._vrSwapTimer = null;
            }
            this._vrBundleRequest = null;

            // The advertisement carousel of the rooms tab must not keep
            // sliding when the view is gone.
            this._stopAdCarouselAutoSlide();
        },

        /* ------------------------------------------------------------
         *  Advertisements
         *
         *  The panel under the filter bar reuses the advertisement carousel of
         *  the booking page and of the user manual page: the same service, the
         *  same picture transformation and the same auto-slide with
         *  pause/resume.
         *  ------------------------------------------------------------ */

        _loadAdvertisements: async function () {
            let aCarouselItems = [];

            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_Advertisement");
                aCarouselItems = this._transformAdvertisementData(oResponse?.data || []);
            } catch (oError) {
                aCarouselItems = [];
            }

            // The model is filled outside the try, so a problem in the slide
            // setup can never empty the pictures again.
            this._setupAdvertisementModel(aCarouselItems);
        },

        _transformAdvertisementData: function (aAdvertisements) {
            const aCarouselItems = [];
            const that = this;

            aAdvertisements.forEach(function (oAd) {
                // Every advertisement carries up to three pictures, and each of
                // them becomes a slide of the carousel.
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

            // The service sends the base64 part with white spaces in it.
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

            this.getView().setModel(new JSONModel({
                Advertisements: aCarouselItems,
                currentPage: 0,
                itemsPerPage: 1
            }), "AdvertisementModel");

            if (aCarouselItems.length > 1) {
                this._startAdCarouselAutoSlide();
            } else {
                // A previous visit may have left a slide running for pictures
                // that are no longer there.
                this._stopAdCarouselAutoSlide();
            }
        },

        _startAdCarouselAutoSlide: function () {
            const oCarousel = this.byId("AdvertisementCarousel");

            // The pictures are rendered by the binding, so the carousel only
            // has its pages a moment later. The attempts are capped so a tab
            // that is never opened cannot keep retrying.
            if (!oCarousel || oCarousel.getPages().length <= 1) {
                this._iAdCarouselRetries = (this._iAdCarouselRetries || 0) + 1;

                if (this._iAdCarouselRetries > 40 || !this.getView()) {
                    return;
                }

                setTimeout(() => this._startAdCarouselAutoSlide(), 300);
                return;
            }
            this._iAdCarouselRetries = 0;

            this._stopAdCarouselAutoSlide();

            // The carousel of this UI5 version has no auto-play, so the slide
            // is driven by a timer that moves to the next picture.
            const fnPauseResume = () => {
                this._stopAdCarouselAutoSlide();

                // Resume after 3 seconds of inactivity
                this._iAdCarouselResumeTimer = setTimeout(() => {
                    this._iAdCarouselResumeTimer = null;

                    if (oCarousel && !oCarousel.bIsDestroyed && oCarousel.getPages().length > 1) {
                        this._startAdCarouselAutoSlide();
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
                    this._stopAdCarouselAutoSlide();
                }
            }, 3000);
        },

        _stopAdCarouselAutoSlide: function () {
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
            const sMessage = this.i18nModel
                ? this.i18nModel.getText("advertisementClicked")
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

        onpressFilter: function () {
            var oView = this.getView();
            if (!this.ARD_Dialog) {

                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Filter_Branch", this);
                oView.addDependent(this.ARD_Dialog);
                this.ARD_Dialog.attachAfterClose(function () {
                    this._startHomeImageSlider();
                }.bind(this));
            }
            this._stopHomeImageSlider();
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

            // ðŸ”¥ FIX: You forgot these
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
            this._stopHomeImageSlider();
            this.getView().addStyleClass("blur-background");
            this._oSignDialog.open();
        },

        onDialogClose: function () {
            this._resetOtpState();

            if (this._oSignDialog) {
                this.getView().removeStyleClass("blur-background");

                this._oSignDialog.close();   // Close first
                this._oSignDialog.destroy(); // Destroy

                this._oSignDialog = null;    // ðŸ”¥ CRITICAL FIX
            }
            // Dialog was destroyed â€“ afterClose won't fire, so resume slider directly
            this._startHomeImageSlider();
        },

        onSwitchToSignIn: function () {
            this.oViewModel.setProperty("/authFlow", "signin");
            this.oViewModel.setProperty("/loginMode", "password");
            this.oViewModel.setProperty("/forgotStep", 0);
            this.oViewModel.setProperty("/dialogTitle", "Sign In");

            // RESET OTP + TIMER
            this._resetOtpState();

            // RESET PASSWORD STRENGTH LABELS
            utils._LCresetPasswordStrength();

            // RESET SIGN-IN FIELDS
            ["signInEmail", "signinPassword", "signInOTP"]
                .forEach(id => {
                    const c = $C(id);
                    if (c) {
                        c.setValue("");
                        c.setValueState("None");
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
                    }
                });

            // ðŸš« DISABLE FORGOT FORM
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
        _setDefaultCountryIndiaSignup: function () {
    const oLoginModel = this.getView().getModel("LoginMode");
    oLoginModel.setProperty("/Country", "India");
    this.onChangeCountry(null); // reuses _findBestMatch + state filtering, same as manual entry
},

        onSwitchToSignUp: function () {
            const oSignInPanel = $C("signInPanel");
            const oSignUpPanel = $C("signUpPanel");

            // ðŸ”’ DOB Read-only and Titles
            this._FragmentDatePickersReadOnly(["signUpDOB"]);
            this.oViewModel.setProperty("/authFlow", "signup");
            this.oViewModel.setProperty("/dialogTitle", "Sign Up"); // Added back

            // RESET PASSWORD STRENGTH LABELS
            utils._LCresetPasswordStrength();

            oSignInPanel?.setVisible(false);
            oSignUpPanel?.setVisible(true);

            // DOB Limits Logic
            const oDOBpicker = $C("signUpDOB");
            if (oDOBpicker) {
                const oToday = new Date();
                oDOBpicker.setMaxDate(oToday);
                // oDOBpicker.setMinDate(new Date(2000, 0, 1)); // Jan 1, 2000 as minimum age limit
            }
 this._setDefaultCountryIndiaSignup();
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
                        this._setDefaultCountryIndiaSignup();
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
            const oInput = oIcon.getParent(); // ðŸ‘ˆ actual input owning the icon
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
            const sId = oInput.getId(); // ðŸ”¥ Sabse pehle ID lein
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

            // âœ… Only generate + validate (NO copying here)
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
             


const sSuccessMsg = this.i18nModel.getText("registrationSuccess", [
    Salutation,
    sUsername
]);
                const sPassword = data.password;
                const oCtrl = this; // ðŸ‘ˆ REQUIRED
                MessageBox.success(sSuccessMsg, {
                    title: this.i18nModel.getText("success"),
                    contentWidth: "500px",
                    styleClass: "myUnifiedBtn",
                    onClose: () => {
                        // âœ… Credentials trigger FIRST
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
                    title: this.i18nModel.getText("RegistrationFailed")
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

            // â— User typed a value without valid parents â†’ reset
            if (!hasCountry || !hasState) {
                oCity.setValue("");
                oCity.setSelectedKey("");
                oCity.getBinding("items")?.filter([new Filter("cityName", "EQ", "__NONE__")]);
                oCity.setValueState("None");
                return;
            }
            // Normal mandatory check when parents are valid
            utils._LCvalidateMandatoryField(oEvent);
            // ðŸ”¥ PUSH CITY TO MODEL when valid
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
            // ðŸ”¥ STRICT validation while typing
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
                    // Update the dialog's section model, not the viewâ€™s
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
            const oPropertyTypeCombo = oView.byId("id_PropertyType");
            const oPricerange = oView.byId("id_Pricerange");

            // ðŸ”¹ Reset all selected keys
            if (oBranchCombo) oBranchCombo.setSelectedKey("");
            if (oAreaTypeCombo) oAreaTypeCombo.setSelectedKey("");
            if (oRoomTypeCombo) oRoomTypeCombo.setSelectedKey("");
            if (oPricerange) oPricerange.setSelectedKey("");
            if (oPropertyTypeCombo) oPropertyTypeCombo.setSelectedKeys([]).setValueState("None");
            // ðŸ”¹ Make Area, Room Type and Property Type non-editable
            if (oAreaTypeCombo) oAreaTypeCombo.setEnabled(false);
            if (oRoomTypeCombo) oRoomTypeCombo.setEnabled(false);
            if (oPricerange) oPricerange.setEnabled(false);
            if (oPropertyTypeCombo) oPropertyTypeCombo.setEnabled(false);
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

        // ðŸ—“ï¸ Helper date parser
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
            const oPropertyType = oView.byId("id_PropertyType");
            const oPricerange = oView.byId("id_Pricerange");

            // Reset previous selections
            oAreaCombo.setSelectedKey("").setEnabled(false);
            oRoomType.setSelectedKey("").setEnabled(false);
            oPricerange.setSelectedKey("").setEnabled(false);

            oPropertyType.setValueState("None").setEnabled(false);
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;
            // ðŸ”¹ Selected Branch Name
            const sSelectedBranch = oSelectedItem.getText();
            // ðŸ”¹ Fetch existing Branch model data
            const oModelData = oView.getModel("sBRModel").getData();
            // ðŸ”¹ Filter the data for the selected branch name
            const aFiltered = oModelData.filter(function (item) {
                return item.City === sSelectedBranch;
            });
            // ðŸ”¹ Update Area model dynamically
            const oAreaModel = new JSONModel(aFiltered);
            oView.setModel(oAreaModel, "AreaModel");
            this._populateUniqueFilterValues(aFiltered)

            // ðŸ”¹ Enable the Area dropdown now that data is ready
            oAreaCombo.setEnabled(true);
            oRoomType.setEnabled(true);
            oPropertyType.setEnabled(true);
            oPricerange.setEnabled(true);


        },
        onPropertyTypeChange: function (oEvent) {
            const aSelectedPropertyTypes = this._getSelectedPropertyTypes(oEvent.getSource());
            const oModelData = this.getView().getModel("sBRModel").getData();
            var Branch = this.byId("id_Branch").getValue();

            const aFiltered = oModelData.filter(function (item) {
                return (!aSelectedPropertyTypes.length || aSelectedPropertyTypes.includes(item.PropertyType)) &&
                    item.City === Branch;
            });
            // ðŸ”¹ Update Area model dynamically
            const oAreaModel = new JSONModel(aFiltered);
            this.getView().setModel(oAreaModel, "AreaModel");
            this._populateUniqueFilterValues(aFiltered)
        },

        _getSelectedPropertyTypes: function (oMultiComboBox) {
            return (oMultiComboBox.getSelectedItems() || [])
                .map(oItem => oItem.getText().trim())
                .filter(Boolean);
        },

        // ðŸ”¹ When Area is selected, enable Room Type combo
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
            var oCtx = oSource.getBindingContext("VisibilityModel") || oSource.getBindingContext("TopModel");
            if (!oCtx) return;
            var oBranchData = oCtx.getObject();
            var oRouter = this.getOwnerComponent().getRouter();
            var sHash = oRouter.getURL("RouteViewRooms", {
                sPath: oBranchData.BranchID
            });
            var sUrl = window.location.origin + window.location.pathname + "#" + sHash;
            sap.m.URLHelper.redirect(sUrl, true);
        },

        onSearchRooms: async function () {
            this.iTop = 4
            this.iSkip = 0
            this.flag = true
            // const oContainer = this.byId("idBedTypeFlex");
            // oContainer.setBusy(true);

            // City
            var oBranchcity = this.byId("id_Branch").getSelectedKey() || this.byId("id_Branch").getValue();

            if (!oBranchcity) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectCity"));
                // oContainer.setBusy(false);
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
                // oContainer.setBusy(false);
                return;
            }
            // If locality is empty, keep it empty (search by city only)
            var finalBranch = validArea ? validArea.LandMark : "";
            if (finalBranch === "") this.byId("id_Area").setValueState("None");

            // Property Type MultiComboBox. The API expects one comma-separated value.
            var oPropertyTypeCB = this.byId("id_PropertyType");
            var sSelectedPropertyType = this._getSelectedPropertyTypes(oPropertyTypeCB).join(",");
            oPropertyTypeCB.setValueState("None");

            const sPricerange = this.byId("id_Pricerange")?.getSelectedKey() || this.byId("id_Pricerange")?.getValue();


            this.isInitialLoad = false;
            this.isShowmore = true;


            try {
                this.getBusyDialog()
                await this._loadFilteredData(oBranchcity, finalBranch, sSelectedACType, sSelectedPropertyType,sPricerange);
                this.closeBusyDialog()

            } catch (e) {
                console.log(e);
            } finally {
                // oContainer.setBusy(false);
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
            this.isShowmore = false
            const sPricerange = this.byId("id_Pricerange")?.getSelectedKey() || this.byId("id_Pricerange")?.getValue();

            await this._loadFilteredData(this.Scity, this.sBranchCode, this.sACType, this.sPropertyType,sPricerange);
            oContainer.setBusy(false);
        },


        Branch: async function (filter) {
            const response = await this.ajaxReadWithJQuery("HM_GetBranchImage", filter);
            this.Branchlength = response?.data.length || 0;
            this.getView().setModel(new JSONModel(response?.data), "BranchModel");

            // this.getOwnerComponent().getModel("sBRModel").setData(response?.data || []);
            let aData = response?.data || [];
            return Array.isArray(aData) ? aData : [];
        },
        Branchdata: async function () {
            const response = await this.ajaxReadWithJQuery("HM_BranchData", "");
            let aData = response?.data || [];
            return Array.isArray(aData) ? aData : [];
        },

        _loadRoomsPageData: async function () {
            this.iTop = 4;
            this.iSkip = 0;

            this.roomtype = false

            // this.byId("idBedTypeFlex").setBusy(true);
            this.byId("id_Branch").setBusy(true).setValueState("None");;
            this.byId("id_Area").setBusy(true);
            this.byId("id_Roomtype").setBusy(true);
            this.byId("id_PropertyType").setBusy(true);
            this.byId("id_Pricerange").setBusy(true);


            const oFooterModel = this.getView().getModel("FooterModel");

            oFooterModel.setProperty("/showRoomsFooter", false);
            try {

                var BranchNewData = this.getOwnerComponent().getModel("branchModel1");

                if (!BranchNewData) {
                    var localdata = await this.Branchdata()

                    this.getOwnerComponent().getModel("sBRModel").setData(localdata)
                }
                var data = this.getOwnerComponent().getModel("sBRModel").getData()


                if (this.cityuse === false) {
                    var FCity = data.find((item) => {
                        return item.City === "Kalaburagi"
                    })
                    var city = FCity ? FCity.City : data[0].City;
                    var fCity = this.City ? this.City : city;
                } else {
                    var City = data.find((item) => {
                        return item.BranchID === this.getOwnerComponent().getModel("sPathModel").getData().Branch
                    })
                    var fCity = City.City;
                }

                var filter = {
                    flag: "true",
                    top: this.iTop,
                    skip: this.iSkip,
                    City: fCity
                }
                this.getBusyDialog()
                var oModelData = await this.Branch(filter);

                this.closeBusyDialog()
                 var type=this.PropertyType ?this.PropertyType :""

                if(this.PropertyType){
                this.isInitialLoad = false;
                this.PropertyType=""
                }else{
                this.isInitialLoad = true;
                }
                this.isShowmore = false


                if (this.cityuse === false) {
                    var sCity = this.City ? this.City : FCity ? FCity.City : data[0].City;
                } else {
                    var sCity = City ? City.City : data[0].City;
                }

                const aFiltered = oModelData.filter(item => item.City === sCity);
                const aFilteredproperdata = data.filter(item => item.City === sCity);


              const aUnique = aFiltered.filter((item, index, self) =>
                    index === self.findIndex(t => t.Name === item.Name)
                );
                this.getView().setModel(new JSONModel(aUnique), "AreaModel");

                if (aFiltered.length === 0 || sCity) {

                    await this._loadFilteredData(sCity, "", "", type);
                } else {
                    await this._loadFilteredData(this.City, "", "", type);
                }
            

                this._populateUniqueFilterValues(aFilteredproperdata)
                this._populateUniqueFilterValuesBranch(data)



                // Default selections
                this.byId("id_Branch").setSelectedKey(sCity);
                this.byId("id_PropertyType").setSelectedKeys([]).setValueState("None").setEnabled(true);
                this.byId("id_Area").setEnabled(true).setSelectedKey("");
                if (this.roomtype !== true) this.byId("id_Roomtype").setEnabled(true).setSelectedKey("");
            } catch (error) {
                console.log("Error loading Rooms:", error);
            } finally {
                // this.byId("idBedTypeFlex").setBusy(false);
                this.byId("id_Branch").setBusy(false);
                this.byId("id_Area").setBusy(false);
                this.byId("id_Roomtype").setBusy(false);
                this.byId("id_Pricerange").setBusy(false);

                this.byId("id_PropertyType").setBusy(false);
                // âœ… show ROOMS footer after success OR failure
                oFooterModel.setProperty("/showRoomsFooter", true);
                oFooterModel.setProperty("/showGlobalFooter", false);

            }
        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                id_Roomtype: new Map(),
                id_Area: new Map()
            };

            data.forEach(item => {
                if (item.Name && item.Name.trim()) {
                    let value = item.Name.trim().replace(/\s+/g, " ");
                    let key = value.toLowerCase();

                    if (!uniqueValues.id_Roomtype.has(key)) {
                        uniqueValues.id_Roomtype.set(key, value);
                    }
                }

                if (item.LandMark && item.LandMark.trim()) {
                    let value = item.LandMark.trim().replace(/\s+/g, " ");
                    let key = value.toLowerCase();

                    if (!uniqueValues.id_Area.has(key)) {
                        uniqueValues.id_Area.set(key, value);
                    }
                }
            });

            let oView = this.getView();

            ["id_Roomtype", "id_Area"].forEach(field => {
                let oComboBox = oView.byId(field);
                if (!oComboBox) return;

                oComboBox.destroyItems();

                Array.from(uniqueValues[field].values())
                    .sort((a, b) => a.localeCompare(b, undefined, {
                        sensitivity: "base"
                    }))
                    .forEach(value => {
                        oComboBox.addItem(
                            new sap.ui.core.Item({
                                key: value,
                                text: value
                            })
                        );
                    });
            });
        },
        _loadFilteredData: async function (Scity, sBranchCode, BranchName, sPropertyType,sPricerange) {
            const oView = this.getView();
            const oVisibilityModel = oView.getModel("VisibilityModel");

            var data = this.getOwnerComponent().getModel("sBRModel").getData()
            var Branchdata = data.filter((item) => {
                return item.City === Scity && item.Status ==="Active"
            })
            this.Branchlength = Branchdata.length

            try {
                let aBranchesData;
                if (!this.isInitialLoad) {
                    let response = await this.ajaxReadWithJQuery("HM_GetBranchImage", {
                        City: Scity,
                        LandMark: sBranchCode,
                        Name: BranchName,
                        PropertyType: sPropertyType || "",
                        top: this.iTop,
                        skip: this.iSkip,
                        flag: "true",
                        priceRange:sPricerange
                    });
                    aBranchesData = response?.data || [];
                    // this.Branchlength = aBranchesData.length || 0;

                    if (this.getOwnerComponent().getModel("branchModel1")) {
                        let oBRModel = this.getOwnerComponent().getModel("sBRModel");
                        let existingBranchData = oBRModel.getData() || [];
                        var Branchdata = existingBranchData.filter((item) => {
                            return item.City === Scity
                        })
                        this.Branchlength = Branchdata.length

                    }
                    if (this.isShowmore === true) {
                        var data = this.getOwnerComponent().getModel("sBRModel").getData()
                        var Branchdata = data.filter((item) => {
                            return item.City === Scity
                        })

                        this.Branchlength = Branchdata.length
                    };
                    if (sBranchCode || BranchName || sPropertyType) {
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

                    this._populateUniqueFilterValues(aUpdatedData)
                    this._populateUniqueFilterValuesBranch(this.getOwnerComponent().getModel("sBRModel").getData())


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
                // Property Type narrows whatever City / LandMark already matched.
                // Applied client-side too because the cached BranchModel used on the
                // initial load was fetched without a PropertyType.
                if (sPropertyType) {
                    const aPropertyTypes = sPropertyType.split(",").map(sType => sType.trim()).filter(Boolean);
                    aFilteredBranches = aFilteredBranches.filter(branch =>
                        aPropertyTypes.includes(branch.PropertyType)
                    );
                }
                if (aFilteredBranches.length === 0) {
                    oVisibilityModel.setProperty("/Branches", []);
                    oVisibilityModel.setProperty("/NoData", true);
                    oVisibilityModel.setProperty("/ShowViewMore", false);
                    return;
                }

                // ðŸ”¥ Convert Base64 to Image
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
                        PropertyType: branch.PropertyType,
                        LandMark: branch.LandMark,
                        Country: branch.Country,
                        GSTIN: branch.GSTIN,
                        CheckInTime: branch.CheckinTime,
                        CheckOutTime: branch.CheckoutTime,
                        GeoLocation: branch.GeoLocation,
                        Image: sImage,
                        TotalFeedbacks: branch.TotalFeedbacks,
                        AverageRating: branch.AverageRating,
                        StartingPrice: branch.StartingPrice,
                        Currency: branch.Currency
                    };
                });
                this.Scity = Scity
                this.sBranchCode = sBranchCode
                this.sACType = BranchName
                this.sPropertyType = sPropertyType
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
                return false; // âœ… EXPLICIT FAIL
            }
            // Compare
            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                return false; // âœ… EXPLICIT FAIL
            }
            // Success
            oInput.setValueState("None");
            return true; // âœ… EXPLICIT PASS
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
            utils._LCresetPasswordStrength();
            this.oViewModel.setProperty("/authFlow", "forgot");
            this.oViewModel.setProperty("/forgotStep", 1); // safe, runtime only
            this.oViewModel.setProperty("/dialogTitle", "Set / Reset Password"); //
            this._addPasswordGenerateIcon();

            ["fpEmailId", "fpOTP", "newPass", "confPass"].forEach(id => {
                const c = $C(id);
                if (c) c.setEnabled(true);
            });
        },

        onSelectLoginMode: function (e) {
            const mode = e.getSource().getText().toLowerCase(); // "password" or "otp"

            this.oViewModel.setProperty("/loginMode", mode);

            // ðŸ”¥ Always reset OTP field visibility when switching modes
            this.oViewModel.setProperty("/showOTPField", false);
            this.oViewModel.setProperty("/isOtpEntered", false);
            // ðŸ”¥ Clean OTP input field and disable it
            const otpCtrl = $C("signInOTP");
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }
            // ðŸ”¥ Reset password field too (fresh mode)
            const passCtrl = $C("signinPassword");
            if (passCtrl) {
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }
            // ðŸ”¥ Hide Send OTP button unless user is in OTP mode
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
            utils._LCresetPasswordStrength();
            this._storedLoginCreds = null;
            this._oResetUser = null;
            this._resetOtpState();
        },

        _resetAuthDialog: function () {
            this._startHomeImageSlider();

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

            // ðŸ”¥ PASSED ALL VALIDATIONS â†’ SUCCESS STATE
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

                MessageBox.success(this.i18nModel.getText("Passwordupdatedsuccessfully"), {
                    title: this.i18nModel.getText("success"),
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

            // ðŸ”¥ OTP VERIFIED SUCCESSFULLY â†’ DESTROY EXPIRY STATE (INLINE)
            this._clearOtpValidityTimer();
            this._clearOtpResendTimer();
            this.oViewModel.setProperty("/otpExpiryTs", null);
            this.oViewModel.setProperty("/otpValidityText", "");

            // ðŸ“Œ Forgot Password Flow
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

            // ðŸ”¥ CRITICAL: Set the photo from backend
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
                oInput.capture = ""; // remove camera request â†’ gallery
                oInput.click();
            }, 200);
        },

        onAvatarFileSelected: async function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (!file) return;
            const MAX_SIZE_KB = 400;
            const iMaxSizeBytes = MAX_SIZE_KB * 1024;
            let processedFile = file;

            if (file.size > iMaxSizeBytes) {
                if (typeof imageCompression === "undefined") {
                    MessageToast.show(this.i18nModel.getText("Compressionlibrarynotavailable"));
                    oEvent.getSource().clear();
                    return;
                }

                this.getBusyDialog();
                try {
                    processedFile = await imageCompression(file, {
                        maxSizeMB: (MAX_SIZE_KB - 10) / 1024,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                        initialQuality: 0.95
                    });
                } catch (err) {
                    MessageBox.error(err.message || "Compression failed. Please try a smaller image.");
                    oEvent.getSource().clear();
                    return;
                } finally {
                    this.closeBusyDialog();
                }

                if (processedFile.size > iMaxSizeBytes) {
                    MessageToast.show(this.i18nModel.getText("fileCompressionFailed", [file.name]));
                    oEvent.getSource().clear();
                    return;
                }
            }
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fullDataURL = e.target.result;
                const base64 = fullDataURL.split(",")[1]; // remove prefix

                const oModel = this._oProfileDialog.getModel("profileData");
                oModel.setProperty("/photo", fullDataURL);
                await this.updateUserPhoto({
                    fileName: processedFile.name || file.name,
                    fileType: processedFile.type || file.type,
                    fileContent: base64
                });
            };
            reader.readAsDataURL(processedFile);
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

            // ----------------------------- OTP MODE PRE-CHECKS -----------------------------
            if (isOTP) {
                const showOTPField = vm.getProperty("/showOTPField");
                const isOtpEntered = vm.getProperty("/isOtpEntered");
                const otpCtrl = $C("signInOTP");

                if (!showOTPField) return MessageToast.show(this.i18nModel.getText("pleaseGenerateOTPFirst"));
                if (!isOtpEntered) {
                    otpCtrl.setValueState("Error");
                    otpCtrl.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
                    return MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                }
                if (!/^\d{6}$/.test(sOTP)) {
                    otpCtrl.setValueState("Error");
                    otpCtrl.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                    return MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                }
                const expiryTs = vm.getProperty("/otpExpiryTs");
                if (!expiryTs || Date.now() > expiryTs) return this._onOtpExpired();
            } else {
                // -------------------------- PASSWORD MODE PRE-CHECKS -------------------------
                const passCtrl = $C("signinPassword");

                if (!sPassword) {
                    passCtrl.setValueState("Error");
                    passCtrl.setValueStateText(this.i18nModel.getText("passwordRequired"));
                    return MessageToast.show(this.i18nModel.getText("passwordRequired"));
                }
                if (!utils._LCvalidatePassword(passCtrl)) {
                    passCtrl.setValueState("Error");
                    passCtrl.setValueStateText(this.i18nModel.getText("enterValidPassword"));
                    return MessageToast.show(this.i18nModel.getText("enterValidPassword"));
                }
                passCtrl.setValueState("None");
                if (!utils._LCvalidatePassword($C("signinPassword"))) return MessageToast.show(this.i18nModel.getText("entervalidpassword"));
            }

            try {
                this.getBusyDialog();

                let payload, oResponse;
                // ----------------------------- OTP MODE -----------------------------
                if (isOTP) {
                    const isValid = await this._verifyOTPWithBackend(sOTP);
                    if (!isValid) return MessageToast.show(this.i18nModel.getText("incorrectOTP"));

                    payload = {
                        EmailID: sEmail,
                        OTP: sOTP
                    };
                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                } else {
                    // -------------------------- PASSWORD MODE -------------------------
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
                debugger
                localStorage.setItem("isLoggedIn", "true");

                localStorage.setItem("_x9A1p", user._x9A1p);
                localStorage.setItem("_k7LmQ", user._k7LmQ);

                localStorage.setItem("_aB39X", btoa(user.UserID));
                localStorage.setItem("_mN72P", btoa(user.UserName));

                // Role Based Access
                if (user.Role === "Customer") {
                    const oUserModel = new JSONModel(user);
                    if (user.FileContent) {
                        oUserModel.setProperty("/Photo", "data:image/png;base64," + user.FileContent);
                    }
                    sap.ui.getCore().setModel(oUserModel, "LoginModel");
                    this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", true);
                    // localStorage.setItem("isLoggedIn", "true");
                } else {
                    this.getOwnerComponent().getRouter().navTo("TilePage");
                }
                // Reset login fields
                $C("signInEmail").setValue("");
                $C("signinPassword").setValue("");
                $C("signInOTP").setValue("");
                // Close dialog
                if (this._oSignDialog) {
                    this.getView().removeStyleClass("blur-background");
                    this._oSignDialog.close(), this._oSignDialog.destroy();
                    this._oSignDialog = null;
                }
                // Dialog was destroyed â€“ afterClose won't fire, so resume slider directly
                this._startHomeImageSlider();
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
                this._onProfileSTDChange(); // â¬… same behavior
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
            // Untouched empty field â†’ no error
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
            // No state selected â†’ clear state in model and exit
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
            const oHeader = this.byId("mainTabHeader");
            const oItem = oHeader && oHeader.getItems().find(item => item.getKey() === "idVendor");
            if (!oItem) return;

            const oNav = this.byId("pageContainer");
            const oPage = this.byId("idVendor");
            if (oNav && oNav.getCurrentPage() !== oPage) {
                oNav.attachEventOnce("afterNavigate", function (oEvent) {
                    // ORIGINAL (restore by uncommenting, then remove the _vrScrollToTop block below):
                    // if (!this._vrExited && oEvent.getParameter("to") === oPage) {
                    //     this._vrScrollTo("register");
                    // }
                    if (oEvent.getParameter("to") === oPage) {
                        this._vrScrollToTop();
                    }
                }, this);
            }
            oHeader.setSelectedKey("idVendor");
            this.onTabSelect({ getParameter: function () { return oItem; } });
            this._initAdminSignupControls();
            // ORIGINAL: this._vrScrollTo("register");
            this._vrScrollToTop();
        },

        onAdminLoadLocations: function () {
            const oComponent = this.getOwnerComponent();
            const oModel = this.getView().getModel("AdminSignupModel");
            const aMissing = [["Country", "CountryModel"], ["State", "StateModel"], ["City", "CityModel"]]
                .filter(entry => !oComponent.getModel(entry[1]));
            if (!aMissing.length) {
                this._initAdminSignupControls();
                return;
            }
            if (this._adminGeoRequest) return this._adminGeoRequest;
            oModel.setProperty("/LocationsLoading", true);
            oModel.setProperty("/LocationsError", "");
            this._adminGeoRequest = Promise.all(aMissing.map(entry => oComponent._fetchCommonData(entry[0], entry[1])))
                .then(() => {
                    if (this._vrExited) return;
                    this._initAdminSignupControls();
                    if (aMissing.some(entry => !oComponent.getModel(entry[1]))) {
                        this._vrSetSignupMessage("LocationsError", "vrErrLocations");
                    }
                })
                .catch(() => {
                    if (!this._vrExited) this._vrSetSignupMessage("LocationsError", "vrErrLocations");
                })
                .finally(() => {
                    this._adminGeoRequest = null;
                    if (!this._vrExited) oModel.setProperty("/LocationsLoading", false);
                });
            return this._adminGeoRequest;
        },

        _initAdminSignupControls: function () {
            if (this._vrExited || this._adminGeoSyncing) return;
            const oView = this.getView();
            const oModel = oView.getModel("AdminSignupModel");
            if (!oModel) return;

            const oSuccess = this.byId("successBox");
            if (oSuccess && this._adminSuccessBox !== oSuccess) {
                if (this._adminSuccessBox) {
                    this._adminSuccessBox.removeEventDelegate(this._adminSuccessDelegate);
                }
                this._adminSuccessBox = oSuccess;
                this._adminSuccessDelegate = {
                    onAfterRendering: function () {
                        const oDom = oSuccess.getDomRef();
                        if (oDom && oModel.getProperty("/Submitted")) {
                            oDom.setAttribute("tabindex", "-1");
                            oDom.focus();
                            this._vrScrollTo("register");
                        }
                    }
                };
                oSuccess.addEventDelegate(this._adminSuccessDelegate, this);
            }

            // The component installs these models independently after their requests finish.
            this._adminGeoBindings = this._adminGeoBindings || [];
            let bChanged = false;
            ["CountryModel", "StateModel", "CityModel"].forEach((sName, i) => {
                const oSource = oView.getModel(sName) || this.getOwnerComponent().getModel(sName);
                let oEntry = this._adminGeoBindings[i];
                if (!oEntry || oEntry.model !== oSource) {
                    if (oEntry && oEntry.binding) oEntry.binding.destroy();
                    oEntry = { model: oSource, data: null, binding: null };
                    this._adminGeoBindings[i] = oEntry;
                    if (oSource) {
                        oEntry.binding = oSource.bindList("/");
                        oEntry.binding.attachChange(this._initAdminSignupControls, this);
                    }
                    bChanged = true;
                }
                const oData = oSource && oSource.getData();
                if (oEntry.data !== oData) bChanged = true;
                oEntry.data = oData;
            });

            // The country is the first model to arrive; the state and city models
            // follow in their own requests. Requiring all three before doing any
            // work left the state list empty (and the STD code unset) for as long
            // as the slowest request took, even though the country was already
            // prefilled. Each model is now initialised as it appears, and the
            // setup is only treated as complete once every one has arrived.
            if (!Array.isArray(this._adminGeoBindings[0].data) ||
                !this._adminGeoBindings[0].data.length || !this.byId("adminsignUpCountry")) return;
            const bAllGeoLoaded = this._adminGeoBindings.every(entry => Array.isArray(entry.data));
            if (this._adminGeoInitialized && !bChanged) return;

            this._adminGeoSyncing = true;
            try {
                if (!this._adminGeoInitialized && !this._adminGeoEdited) {
                    // Country + country code defaults. The address itself is filled
                    // by _applyGeoPrefill below, once the syncing lock is released.
                    this._setDefaultCountryIndia();
                } else {
                    this.ADMIN_onChangeCountry();
                    this.ADMIN_onChangeState();
                    this.ADMIN_onChangeCity();
                }
                // Stay "uninitialised" until the last model arrives, so the later
                // arrivals still filter their own list.
                this._adminGeoInitialized = bAllGeoLoaded;
            } finally {
                this._adminGeoSyncing = false;
            }
            // Runs on every model arrival, so whichever finishes last (the location
            // lookup or the models) still fills the address in.
            this._applyGeoPrefill();
            this._updateAdminSignupProgress();
        },

        // Fills the address from the browser location, but only while the visitor
        // has not entered anything themselves. Safe to call repeatedly: it is
        // invoked both when the country/state/city models arrive and when the
        // location lookup finishes, so the two orders behave the same. Each step
        // runs in order because the country filters the states and the state
        // filters the cities.
        _applyGeoPrefill: function () {
            if (this._vrExited || this._adminGeoEdited || this._adminGeoSyncing || !this.Country) return;

            const oModel = this.getView().getModel("AdminSignupModel");
            const oCountryModel = this.getView().getModel("CountryModel") || this.getOwnerComponent().getModel("CountryModel");
            if (!oModel || !oCountryModel || !Array.isArray(oCountryModel.getData()) || !this.byId("adminsignUpCountry")) return;

            const oMatch = this._findBestMatch(this.Country, oCountryModel.getData(), "countryName");
            if (!oMatch) return;

            this._adminGeoSyncing = true;
            try {
                oModel.setProperty("/Country", oMatch.countryName);
                this.ADMIN_onChangeCountry();
                if (this.State) {
                    oModel.setProperty("/State", this.State);
                    this.ADMIN_onChangeState();
                }
                if (this.City) {
                    oModel.setProperty("/City", this.City);
                    this.ADMIN_onChangeCity();
                }
            } finally {
                this._adminGeoSyncing = false;
            }
            this._updateAdminSignupProgress();
        },

        _triggerAutoPopulation: function () {
            // Kept as a thin alias so any external caller still works.
            this._applyGeoPrefill();
        },

        ADMIN_onChangeCountry: function (oEvent) {
            const oCountry = oEvent ? oEvent.getSource() : this.byId("adminsignUpCountry");
            if (!oCountry) return;
            const oModel = this.getView().getModel("AdminSignupModel");
            const oStateModel = this.getView().getModel("StateModel");
            const oCountryModel = this.getView().getModel("CountryModel") || this.getOwnerComponent().getModel("CountryModel");
            const oCityModel = this.getView().getModel("CityModel");

            if (oEvent) {
                this._adminGeoEdited = true;
                const oItem = oEvent.getParameter("selectedItem");
                oModel.setProperty("/Country", oItem ? oItem.getKey() : oCountry.getValue().trim());
                oModel.setProperty("/State", "");
                oModel.setProperty("/City", "");
                oModel.setProperty("/STDCode", "");
                if (oStateModel) oStateModel.setProperty("/filtered", []);
                if (oCityModel) oCityModel.setProperty("/filtered", []);
                ["adminsignUpState", "adminsignUpCity"].forEach(id => {
                    const oControl = this.byId(id);
                    if (oControl) oControl.setSelectedKey("").setValue("").setValueState("None");
                });
            }

            const aCountries = oCountryModel ? oCountryModel.getData() : [];
            const sSearch = oModel.getProperty("/Country");
            const oMatch = this._findBestMatch(sSearch, aCountries, "countryName");
            if (oMatch) {
                oCountry.setSelectedKey(oMatch.countryName);
                oCountry.setValueState("None");
                oModel.setProperty("/Country", oMatch.countryName);
                const sCountryCode = oMatch.code;
                if (oStateModel) {
                    const allStates = oStateModel.getData() || [];
                    oStateModel.setProperty("/filtered", Array.isArray(allStates) ? allStates.filter(s => s.countryCode === sCountryCode) : []);
                }
                const oMobile = this.byId("adminMobileNo");
                if (oMobile) oMobile.setMaxLength(sCountryCode === "IN" ? 10 : 18);
                if (oEvent || this._adminCountryCode !== sCountryCode || !oModel.getProperty("/STDCode")) {
                    this._autoSelectSTD(sCountryCode);
                }
                this._adminCountryCode = sCountryCode;
            } else if (oEvent) {
                oCountry.setValueState("Error");
                this._adminCountryCode = "";
            }
            this._updateAdminSignupProgress();
        },

        ADMIN_onChangeState: function (oEvent) {
            const oState = oEvent ? oEvent.getSource() : this.byId("adminsignUpState");
            if (!oState) return;
            const oModel = this.getView().getModel("AdminSignupModel");
            const oStateModel = this.getView().getModel("StateModel");
            const oCityModel = this.getView().getModel("CityModel");

            if (oEvent) {
                this._adminGeoEdited = true;
                const oItem = oEvent.getParameter("selectedItem");
                oModel.setProperty("/State", oItem ? oItem.getKey() : oState.getValue().trim());
                oModel.setProperty("/City", "");
                const oCity = this.byId("adminsignUpCity");
                if (oCity) oCity.setSelectedKey("").setValue("").setValueState("None");
            }

            const aFilteredStates = oStateModel ? oStateModel.getProperty("/filtered") || [] : [];
            const sStateSearch = oModel.getProperty("/State");
            const oMatch = this._findBestMatch(sStateSearch, aFilteredStates, "stateName");
            if (oMatch) {
                oState.setSelectedKey(oMatch.stateName);
                oState.setValueState("None");
                oModel.setProperty("/State", oMatch.stateName);
            } else if (oEvent) {
                oState.setValueState("Error");
            }
            if (oCityModel) {
                const allCities = oCityModel.getData() || [];
                oCityModel.setProperty("/filtered", oMatch && Array.isArray(allCities) ? allCities.filter(c =>
                    c.countryCode === oMatch.countryCode && c.stateName === oMatch.stateName
                ) : []);
            }
            this._updateAdminSignupProgress();
        },

        ADMIN_onChangeCity: function (oEvent) {
            const oCityCtrl = oEvent ? oEvent.getSource() : this.byId("adminsignUpCity");
            if (!oCityCtrl) return;
            const oModel = this.getView().getModel("AdminSignupModel");
            const oCityModel = this.getView().getModel("CityModel");

            if (oEvent) {
                this._adminGeoEdited = true;
                const oItem = oEvent.getParameter("selectedItem");
                oModel.setProperty("/City", oItem ? oItem.getKey() : oCityCtrl.getValue().trim());
                utils._LCvalidateMandatoryField(oEvent);
            }
            const aFilteredCities = oCityModel ? oCityModel.getProperty("/filtered") || [] : [];
            const sCitySearch = oModel.getProperty("/City");
            const oMatch = this._findBestMatch(sCitySearch, aFilteredCities, "cityName");
            if (oMatch) {
                oCityCtrl.setSelectedKey(oMatch.cityName);
                oModel.setProperty("/City", oMatch.cityName);
                oCityCtrl.setValueState("None");
            }
            this._updateAdminSignupProgress();
        },
        _findBestMatch: function (sInput, aItems, sPropertyName) {
            if (!sInput || !Array.isArray(aItems) || aItems.length === 0) return null;
            const sNormInput = sInput.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
            if (!sNormInput) return null;

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
            const oSTD = this.byId("adminsignUpSTD");
            if (!oSTD) return;
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
            const oMobile = this.byId("adminMobileNo");
            const oModel = this.getView().getModel("AdminSignupModel");
            if (!sValue) {
                oSTD.setValueState("Error");
                oSTD.bindProperty("valueStateText", "i18n>stdCodeRequired");
                oModel.setProperty("/STDCode", "");
                return;
            }
            const STD_REGEX = /^\+[1-9][0-9]*$/;
            if (!STD_REGEX.test(sValue)) {
                oSTD.setValueState("Error");
                oSTD.bindProperty("valueStateText", "i18n>STDPlusicon");
                oModel.setProperty("/STDCode", "");
            } else {
                oSTD.setValueState("None");
                if (oMobile) {
                    oMobile.setMaxLength(sValue === "+91" ? 10 : 18);
                }
                oModel.setProperty("/STDCode", sValue);
            }
            this._updateAdminSignupProgress();
        },

        ADMIN_onMobileLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");
            const std = oModel.getProperty("/STDCode") || "";
            const val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);
            oModel.setProperty("/Mobile", val);
            // Same rules as the original dialog: empty clears, a missing STD code asks
            // for one first, otherwise the shared ISD-aware mobile validator decides.
            if (!val) {
                oInput.setValueState("None");
            } else if (!std) {
                oInput.setValueState("Error");
                oInput.bindProperty("valueStateText", "i18n>selectISDCodeFirst");
            } else {
                utils._LCvalidateISDmobile(oInput, std);
                oInput.bindProperty("valueStateText", "i18n>" + (std === "+91" ? "MSmobileNoValueStateIN" : "MSmobileNoValueStateINT"));
            }
            this._updateAdminSignupProgress();
        },

        onAdminLiveValidate: function (oEvent) {
            const oInput = oEvent.getSource();
            const id = oInput.getId();
            const oModel = this.getView().getModel("AdminSignupModel");
            if (id.endsWith("--adminVendorName")) {
                oModel.setProperty("/VendorName", oInput.getValue());
                utils._LCvalidateName(oEvent);
            } else if (id.endsWith("--adminEmail")) {
                oModel.setProperty("/Email", oInput.getValue());
                utils._LCvalidateEmail(oEvent);
            }
            this._updateAdminSignupProgress();
        },

        ADMIN_onChangeDOB: function (oEvent) {
            const oDatePicker = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");
            const raw = oDatePicker.getDateValue();
            if (!raw || oEvent.getParameter("valid") === false || Number.isNaN(raw.getTime())) {
                oDatePicker.setValueState("Error");
                this._invalidateDOB(oModel);
                return;
            }
            // Same sanity range as the original dialog (0-100 years); the picker
            // itself already blocks dates outside min/max.
            const today = new Date();
            let age = today.getFullYear() - raw.getFullYear();
            const m = today.getMonth() - raw.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < raw.getDate())) age--;
            if (age < 0 || age > 100) {
                oDatePicker.setValueState("Error");
                this._invalidateDOB(oModel);
                return;
            }
            oDatePicker.setValueState("None");
            const yyyy = raw.getFullYear();
            const mm = String(raw.getMonth() + 1).padStart(2, "0");
            const dd = String(raw.getDate()).padStart(2, "0");
            oModel.setProperty("/DOB", `${yyyy}-${mm}-${dd}`);
            this._updateAdminSignupProgress();
        },

        _invalidateDOB: function (oModel) {
            oModel.setProperty("/DOB", "");
            this._updateAdminSignupProgress();
        },

        onSubmitAdminSignup: async function () {
            const oModel = this.getView().getModel("AdminSignupModel");
            if (oModel.getProperty("/Submitting") || oModel.getProperty("/ProcessingActive") || oModel.getProperty("/Submitted")) return;
            if (!this._validateAdminSignupFields()) return;
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
            oModel.setProperty("/Submitting", true);
            // The button keeps its label; progress is shown with the shared busy
            // dialog from BaseController for the duration of the backend call.
            this.getBusyDialog();
            try {
                // getBusyDialog opens the dialog from a promise, so a fast response
                // could otherwise reach the finally block before the dialog exists,
                // leaving it open forever. Waiting for that promise makes the
                // open/close order deterministic. A failure here is cosmetic and
                // must not fail the registration itself.
                try {
                    if (this._pBusyDialog) { await this._pBusyDialog; }
                } catch (oBusyError) {
                    console.warn("Busy dialog could not be shown:", oBusyError);
                }
                await this.ajaxCreateWithJQuery("HM_Login", payload);
                if (this._vrExited) return;
                const sUsername = (oAdmin.VendorName || "").trim();
                const sSalutation = oAdmin.Salutation || "";
                oModel.setProperty("/SuccessMessage", this._vrT("registrationSubmittedMessage", [sSalutation, sUsername]));
                oModel.setProperty("/Submitted", true);
                oModel.setProperty("/Progress", 100);
                this._vrScrollTo("register");
            } catch (err) {
                console.error("Admin signup error:", err);
                if (this._vrExited) return;
                let sErrorMessage = this._vrT("RegistrationfailedPleasetryagainlater");

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
                    title: this._vrT("RegistrationFailed"),
                    // Matches the app's other dialogs: the style class lands on the
                    // dialog, and .myUnifiedBtn .sapMBtnInner themes its buttons.
                    styleClass: "myUnifiedBtn"
                });

            } finally {
                this.closeBusyDialog();
                oModel.setProperty("/Submitting", false);
                this._updateAdminSignupProgress();
            }
        },


        _hookAdminDropZone: function () {
            const oZone = this.byId("adminDropZone");
            if (!oZone || this._vrExited || this._adminDropZone === oZone) return;
            if (this._adminDropZone) {
                this._adminDropZone.detachBrowserEvent("dragenter dragover dragleave drop", this._adminDropHandler, this);
            }
            this._adminDropZone = oZone;
            this._adminDropHandler = function (oEvent) {
                const oNative = oEvent.originalEvent || oEvent;
                const oModel = this.getView().getModel("AdminSignupModel");
                const bEnabled = !!oModel.getProperty("/CurrentDocType") &&
                    !oModel.getProperty("/ProcessingActive") && !oModel.getProperty("/Submitting");
                oEvent.preventDefault();
                if (oEvent.type === "dragleave") {
                    if (!oZone.getDomRef()?.contains(oNative.relatedTarget)) oZone.removeStyleClass("svDropOver");
                    return;
                }
                if (oEvent.type !== "drop") {
                    if (bEnabled) oZone.addStyleClass("svDropOver");
                    return;
                }
                oZone.removeStyleClass("svDropOver");
                if (!bEnabled) {
                    if (!oModel.getProperty("/CurrentDocType")) {
                        this._vrSetSignupMessage("DocumentError", "vrDocStepBlocked");
                    }
                    return;
                }
                const aFiles = oNative.dataTransfer && oNative.dataTransfer.files;
                if (aFiles && aFiles.length) {
                    this.onAdminFileSelect({ getParameter: function (sName) { return sName === "files" ? aFiles : undefined; } });
                }
            };
            oZone.attachBrowserEvent("dragenter dragover dragleave drop", this._adminDropHandler, this);
        },

        _updateAdminSignupProgress: function () {
            const oModel = this.getView().getModel("AdminSignupModel");
            if (!oModel || this._vrExited) return;
            const d = oModel.getData();
            const oDOB = d.DOB ? new Date(d.DOB + "T00:00:00") : null;
            const aChecks = [
                !!d.Salutation,
                (d.VendorName || "").trim().length > 0,
                oDOB && oDOB >= d.DOBMin && oDOB <= d.DOBMax,
                !!d.Gender,
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test((d.Email || "").trim()),
                !!d.Country, !!d.State, !!d.City,
                /^\+[1-9]\d*$/.test(d.STDCode || ""),
                (d.STDCode === "+91" ? /^[1-9]\d{9}$/ : /^\d{4,18}$/).test(d.Mobile || ""),
                (d.Address || "").trim().length > 0,
                (d.Documents || []).some(doc => !doc.isProcessing && doc.File),
                !!d.Consent
            ];
            // Prefilled values count as complete: the country and its code are
            // always set, and the country/state/city may also be seeded from the
            // browser location.
            const iProgress = d.Submitted ? 100 : Math.round(aChecks.filter(Boolean).length / aChecks.length * 100);
            if (d.Progress !== iProgress) oModel.setProperty("/Progress", iProgress);

            // Drives the "no documents uploaded yet" hint. The XML expression that
            // used to compute this from the Documents array never re-evaluated to
            // false once a file was added, so the hint stayed visible next to the
            // uploaded file. A plain flag maintained here is reliable.
            const bHasDocuments = (d.Documents || []).some(doc => !doc.isProcessing && doc.File);
            if (d.HasDocuments !== bHasDocuments) {
                oModel.setProperty("/HasDocuments", bHasDocuments);
            }
        },

        _clearAdminSignupDocuments: function () {
            const oModel = this.getView().getModel("AdminSignupModel");
            if (!oModel) return;
            (oModel.getProperty("/Documents") || []).forEach(doc => {
                if (doc.PreviewUrl) URL.revokeObjectURL(doc.PreviewUrl);
            });
            oModel.setProperty("/Documents", []);
        },

        _addBusyProcessingRow: function () {
            const oModel = this.getView().getModel("AdminSignupModel");
            const aDocs = oModel.getProperty("/Documents") || [];
            const sTempId = "__processing__" + Date.now();
            const oTempDoc = {
                FileName: "Compressing...",          // will be hidden because BusyIndicator shown
                VdocType: "",
                size: 0,
                isProcessing: true,                  // triggers BusyIndicator
                tempId: sTempId
            };
            aDocs.push(oTempDoc);
            oModel.setProperty("/Documents", aDocs);
            return sTempId;
        },

        _removeProcessingRow: function (sTempId) {
            const oModel = this.getView().getModel("AdminSignupModel");
            let aDocs = oModel.getProperty("/Documents") || [];
            aDocs = aDocs.filter(doc => doc.tempId !== sTempId);
            oModel.setProperty("/Documents", aDocs);
        },
        onAdminFileSelect: async function (oEvent) {
            const oModel = this.getView().getModel("AdminSignupModel");
            if (this._vrExited || oModel.getProperty("/ProcessingActive") || oModel.getProperty("/Submitting")) return;
            const oUploader = this.byId("adminFileUploader");
            const oDocType = this.byId("adminDocType");
            const file = oEvent.getParameter("files")?.[0];
            if (!file) return;

            const selectedDocType = oDocType ? oDocType.getSelectedKey() : null;
            if (!selectedDocType) {
                this._vrSetSignupMessage("DocumentError", "vrDocStepBlocked");
                if (oUploader) oUploader.clear();
                return;
            }
            if (!VR_ALLOWED_EXT.test(file.name) || (file.type && !VR_ALLOWED_TYPES.includes(file.type))) {
                this.onAdminFileTypeMismatch();
                return;
            }
            if (!file.size) {
                this._vrSetSignupMessage("DocumentError", "vrErrEmptyFile");
                if (oUploader) oUploader.clear();
                return;
            }
            if (this._isDuplicateFile(file.name)) {
                this._vrSetSignupMessage("DocumentError", "thisfilealreadyuploaded");
                if (oUploader) oUploader.clear();
                return;
            }

            const oTask = {};
            this._adminUploadTask = oTask;
            oModel.setProperty("/ProcessingActive", true);
            oModel.setProperty("/DocumentError", "");

            // ðŸ”¥ Add temporary busy row
            const sTempId = this._addBusyProcessingRow();

            // Disable uploader & doc type during processing
            oModel.setProperty("/UploadEnabled", false);
            oModel.setProperty("/DocTypeEnabled", false);

            let processedFile = file;
            const MAX_SIZE_KB = 400;
            const iMaxSizeBytes = VR_MAX_BYTES;
            const isImage = ["image/jpeg", "image/jpg", "image/png"].includes(file.type);

            try {
                if (file.size > iMaxSizeBytes && isImage) {
                    if (typeof imageCompression === "undefined") {
                        throw Object.assign(new Error("Compression library missing"), { i18nKey: "Compressionlibrarynotavailable" });
                    }
                    const options = {
                        maxSizeMB: (MAX_SIZE_KB - 10) / 1024,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                        initialQuality: 0.95
                    };
                    processedFile = await imageCompression(file, options);

                    if (processedFile.size > iMaxSizeBytes) {
                        throw Object.assign(new Error("File compression failed"), { i18nKey: "fileCompressionFailed", i18nArgs: [file.name] });
                    }
                } else if (file.size > iMaxSizeBytes && !isImage) {
                    throw Object.assign(new Error("File size limit exceeded"), { i18nKey: "fileExceeds400KB", i18nArgs: [file.name] });
                }

                // Convert to Base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    this._adminFileReader = reader;
                    reader.onload = () => resolve(reader.result.split(",")[1]);
                    reader.onerror = () => reject(new Error(this._vrT("vrErrReadFile")));
                    reader.onabort = () => reject(new Error(this._vrT("vrErrReadFile")));
                    reader.readAsDataURL(processedFile);
                });

                if (this._vrExited || this._adminUploadTask !== oTask) return;
                const sMimeType = processedFile.type || (/\.pdf$/i.test(file.name) ? "application/pdf" : /\.png$/i.test(file.name) ? "image/png" : "image/jpeg");
                // The uploaded file is renamed to the document type that was picked
                // for it, keeping the original extension (e.g. "Aadhaar Card.pdf").
                const sExtension = (file.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
                const sDocumentName = selectedDocType + sExtension;
                processedFile = new File([processedFile], sDocumentName, {
                    type: sMimeType,
                    lastModified: file.lastModified || Date.now()
                });
                const previewUrl = URL.createObjectURL(processedFile);
                const newDoc = {
                    FileName: sDocumentName,
                    DocumentType: sMimeType,
                    VdocType: selectedDocType,
                    File: base64,
                    Base64: base64,
                    PreviewUrl: previewUrl,
                    size: processedFile.size,
                    originalName: file.name
                };

                // Remove temporary row and add actual document
                this._removeProcessingRow(sTempId);
                const aDocs = oModel.getProperty("/Documents") || [];
                aDocs.push(newDoc);
                oModel.setProperty("/Documents", aDocs);

                // Clear error highlight
                const table = this.byId("adminAttachmentTable");
                if (table) table.removeStyleClass("fileErrorHighlight");

            } catch (err) {
                if (!this._vrExited) {
                    this._removeProcessingRow(sTempId);
                    this._vrSetSignupMessage("DocumentError", err.i18nKey || "vrErrReadFile", err.i18nArgs);
                }
            } finally {
                this._adminFileReader = null;
                if (!this._vrExited && this._adminUploadTask === oTask) {
                    this._adminUploadTask = null;
                    oModel.setProperty("/CurrentDocType", "");
                    if (oUploader) oUploader.clear();
                    if (oDocType) oDocType.setSelectedKey("").setValue("");
                    oModel.setProperty("/DocTypeEnabled", true);
                    oModel.setProperty("/UploadEnabled", false);
                    oModel.setProperty("/ProcessingActive", false);
                    this._updateAdminSignupProgress();
                }
            }
        },

        onAdminFileTypeMismatch: function () {
            this._vrSetSignupMessage("DocumentError", "vrErrDocType");
            this.byId("adminFileUploader")?.clear();
        },
    
        // Helper to show/hide busy indicator on the uploader button (optional)
        _showBusyOnUploader: function (bBusy) {
            const oUploader = this.byId("adminFileUploader");
            if (oUploader) {
                oUploader.setBusy(bBusy);
            }
        },
        ADMIN_onChangeGender: function (oEvent) {
            const oSelect = oEvent.getSource();
            const key = oSelect.getSelectedKey();
            this.getView().getModel("AdminSignupModel").setProperty("/Gender", key);
            oSelect.setValueState(key ? "None" : "Error");
            this._updateAdminSignupProgress();
        },

        _resetAdminSignupForm: function () {
            const C = this.byId.bind(this);
            const oModel = this.getView().getModel("AdminSignupModel");
            if (oModel.getProperty("/Submitting") || oModel.getProperty("/ProcessingActive")) return;
            this.onClosePreview();
            this._clearAdminSignupDocuments();

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
            const oDocType = C("adminDocType");
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
            oModel.setProperty("/Country", "India");
            oModel.setProperty("/STDCode", "+91");
            oModel.setProperty("/Consent", false);
            oModel.setProperty("/ConsentError", "");
            oModel.setProperty("/DocumentError", "");
            oModel.setProperty("/Submitted", false);
            oModel.setProperty("/SuccessMessage", "");
            oModel.setProperty("/Submitting", false);
            oModel.setProperty("/ProcessingActive", false);
            oModel.setProperty("/UploadEnabled", false);
            C("adminGender")?.setEnabled(true);
            C("adminFileUploader")?.clear();
            C("adminDropZone")?.removeStyleClass("svDropOver");
            this._adminGeoEdited = true;
            this._adminGeoInitialized = false;
            this._initAdminSignupControls();
            this._updateAdminSignupProgress();
        },

        onClearAdminSignup: function () {
            this._resetAdminSignupForm();
        },

        // Only acts after a successful submission; a normal "Clear" keeps the
        // form's current (invalid) state untouched.
        _dismissAdminSignupSuccess: function () {
            const oModel = this.getView().getModel("AdminSignupModel");

            if (!oModel || !oModel.getProperty("/Submitted")) return;
            this._resetAdminSignupForm();
        },

        // Toggles the body marker that scopes the vendor stylesheet to the vendor
        // tab, so the dropdown popups rendered into the static area can be themed
        // without affecting the rest of the app.
        _setVendorScope: function (bActive) {
            if (typeof document === "undefined" || !document.body) return;
            document.body.classList.toggle("svVendorScope", !!bActive);
        },

        onAdminConsentChange: function (oEvent) {
            const oModel = this.getView().getModel("AdminSignupModel");
            const bSelected = oEvent.getSource().getSelected();
            oModel.setProperty("/Consent", bSelected);
            this._vrSetSignupMessage("ConsentError", bSelected ? "" : "vrErrConsent");
            this._updateAdminSignupProgress();
        },

        _validateAdminSignupFields: function () {
            const C = this.byId.bind(this);
            const M = this.getView().getModel("AdminSignupModel");
            const std = (C("adminsignUpSTD").getValue() || "").trim();
            const aFields = [
                ["adminSalutation", oField => utils._LCstrictValidationSelect(oField)],
                ["adminVendorName", oField => utils._LCvalidateName(oField, "ID")],
                ["adminDOB", oField => utils._LCvalidateMandatoryField(oField, "ID")],
                ["adminGender", oField => utils._LCstrictValidationSelect(oField)],
                ["adminEmail", oField => utils._LCvalidateEmail(oField, "ID")],
                ["adminsignUpCountry", oField => utils._LCvalidateMandatoryField(oField, "ID")],
                ["adminsignUpState", oField => utils._LCvalidateMandatoryField(oField, "ID")],
                ["adminsignUpCity", oField => utils._LCvalidateMandatoryField(oField, "ID")],
                ["adminsignUpSTD", oField => utils._LCvalidateMandatoryField(oField, "ID")],
                ["adminMobileNo", oField => utils._LCvalidateISDmobile(oField, std)],
                ["adminAddress", oField => utils._LCvalidateAddress(oField)]
            ];
            let oFirstBad = null;
            // Run validators lazily so later fields keep their current state.
            for (const [sId, fnValidate] of aFields) {
                const oField = C(sId);
                const bValid = fnValidate(oField);
                oField.setValueState(bValid ? "None" : "Error");
                if (sId === "adminMobileNo") {
                    oField.bindProperty("valueStateText", "i18n>" + (std === "+91" ? "MSmobileNoValueStateIN" : "MSmobileNoValueStateINT"));
                } else if (sId === "adminAddress") {
                    oField.bindProperty("valueStateText", "i18n>vrErrAddress");
                } else if (sId === "adminGender") {
                    oField.bindProperty("valueStateText", "i18n>vrErrGender");
                } else if (sId === "adminSalutation") {
                    oField.bindProperty("valueStateText", "i18n>MVDsalutation");
                }
                if (!bValid) {
                    oFirstBad = oField;
                    break;
                }
            }
            if (!oFirstBad) {
                const bDocuments = (M.getProperty("/Documents") || []).some(doc => !doc.isProcessing && doc.File);
                this._vrSetSignupMessage("DocumentError", bDocuments ? "" : "vrErrDocRequired");
                if (!bDocuments) oFirstBad = C("adminDocType");
            }
            if (!oFirstBad) {
                const bConsent = !!M.getProperty("/Consent");
                this._vrSetSignupMessage("ConsentError", bConsent ? "" : "vrErrConsent");
                if (!bConsent) oFirstBad = C("adminConsent");
            }
            this._updateAdminSignupProgress();
            if (oFirstBad) {
                oFirstBad.getDomRef()?.scrollIntoView({ block: "center", behavior: "smooth" });
                oFirstBad.focus();
                MessageToast.show(this._vrT("vrErrFixFields"));
                return false;
            }
            return true;
        },

        _initAdminSignupModel: function () {
            const oNow = new Date();
            const iYear = oNow.getFullYear() - VR_MIN_AGE;
            const iDay = Math.min(oNow.getDate(), new Date(iYear, oNow.getMonth() + 1, 0).getDate());
            const oModel = new JSONModel({
                Salutation: "",
                VendorName: "",
                DOB: "",
                Gender: "",
                Email: "",
                Country: "India",
                State: "",
                City: "",
                STDCode: "",
                Mobile: "",
                Address: "",
                CurrentDocType: "",
                Documents: [],
                HasDocuments: false,
                DOBMin: new Date(1930, 0, 1),
                DOBMax: new Date(iYear, oNow.getMonth(), iDay),
                Consent: false,
                ConsentError: "",
                DocumentError: "",
                Submitting: false,
                Submitted: false,
                SuccessMessage: "",
                Progress: 0,
                LocationsLoading: false,
                LocationsError: "",
                UploadEnabled: false,
                DocTypeEnabled: true,
                ProcessingActive: false,   // â† add this
            });
            this.getView().setModel(oModel, "AdminSignupModel");
            this._adminSignupModel = oModel;
            oModel.attachPropertyChange(this._updateAdminSignupProgress, this);
            this.getView().attachModelContextChange(this._initAdminSignupControls, this);
            this._updateAdminSignupProgress();
        },

        _setDefaultCountryIndia: function () {
    const oModel = this.getView().getModel("AdminSignupModel");
    const oCountryModel = this.getView().getModel("CountryModel") || this.getOwnerComponent().getModel("CountryModel");
    const oStateModel = this.getView().getModel("StateModel");

    // Only the country model is required here; the state model may still be in
    // flight, in which case its list is filtered when it arrives.
    if (!oCountryModel) return;

    const aCountries = oCountryModel.getData() || [];
    const oIndia = aCountries.find(c => c.code === "IN") || aCountries.find(c => (c.countryName || "").toLowerCase() === "india");
    if (!oIndia) return;

    // Set Country
    oModel.setProperty("/Country", oIndia.countryName);
    this.byId("adminsignUpCountry")?.setSelectedKey(oIndia.countryName);

    // Filter States for India only
    if (oStateModel) {
        const allStates = oStateModel.getData() || [];
        if (Array.isArray(allStates)) {
            oStateModel.setProperty("/filtered", allStates.filter(s => s.countryCode === "IN"));
        }
    }

    // Mobile/STD defaults for India
    const oMobile = this.byId("adminMobileNo");
    if (oMobile) oMobile.setMaxLength(10);
    this._autoSelectSTD("IN");
},
        onAdminDocTypeChange: function (oEvent) {
            const oModel = this.getView().getModel("AdminSignupModel");
            const key = oEvent.getSource().getSelectedKey();
            oModel.setProperty("/CurrentDocType", key);
            oModel.setProperty("/DocumentError", "");
            oModel.setProperty("/UploadEnabled", !!key);
        },

        _isDuplicateFile: function (fileName) {
            const docs = this.getView()
                .getModel("AdminSignupModel")
                .getProperty("/Documents") || [];
            // Compare against stored original filename
            return docs.some(d => d.originalName === fileName);
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
            const oView = this.getView();
            const oModel = oView.getModel("AdminSignupModel");
            if (oModel.getProperty("/Submitting") || oModel.getProperty("/ProcessingActive")) return;
            const table = this.byId("adminAttachmentTable");

            // Get button
            const oButton = oEvent.getSource();

            // Get row item
            const oItem = oButton.getParent();

            // Get binding context
            const oCtx = oItem.getBindingContext("AdminSignupModel");

            if (!oCtx) {
                return;
            }

            const doc = oCtx.getObject();
            this.onClosePreview();

            // Cleanup preview blob
            if (doc.PreviewUrl) {
                URL.revokeObjectURL(doc.PreviewUrl);
            }

            // Get index from binding path
            const iIndex = parseInt(
                oCtx.getPath().split("/").pop(),
                10
            );

            // Get documents
            const docs = oModel.getProperty("/Documents") || [];

            // Remove only selected row
            docs.splice(iIndex, 1);

            // Update model
            oModel.setProperty("/Documents", docs);

            oModel.setProperty("/DocTypeEnabled", true);

            // Highlight if empty
            if (docs.length === 0) {
                table?.addStyleClass("fileErrorHighlight");
            }
            oModel.setProperty("/DocumentError", "");
            this._updateAdminSignupProgress();
        },

        onAdminDocTypeSelected: function () {
            const uploader = this.byId("adminFileUploader");
            if (uploader && uploader.openFileDialog) uploader.openFileDialog(); // <--- THIS opens Browse dialog
        },

        onAdminPreviewDoc: async function (oEvent) {
            function autoDecodeBase64(b64) {
                if (!b64) {
                    return "";
                }

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

            const oDoc = oEvent.getSource().getBindingContext("AdminSignupModel")?.getObject();

            if (!oDoc || !oDoc.File) {
                sap.m.MessageBox.error(this.i18nModel.getText("nodocfound"));

                return;
            }

            let sBase64 = autoDecodeBase64(oDoc.File);

            let sMimeType = "application/octet-stream";

            if (sBase64.startsWith("iVB")) {
                sMimeType = "image/png";
            } else if (sBase64.startsWith("/9j")) {
                sMimeType = "image/jpeg";
            } else if (sBase64.startsWith("JVBER")) {
                sMimeType = "application/pdf";
            }

            const sFileName = oDoc.FileName || "Document Preview";

            this._sPreviewFileName = sFileName;
            this._sPreviewMimeType = sMimeType;
            this._sPreviewBase64 = sBase64;

            // Destroy old dialog
            if (this._oAdminDocPreview) {
                this._oAdminDocPreview.destroy();
                this._oAdminDocPreview = null;
            }

            // Load Fragment
            if (!this._oAdminDocPreview) {
                this._oAdminDocPreview = await sap.ui.core.Fragment.load({
                    id: this.getView().getId(),

                    name: "sap.ui.com.project1.fragment.DocumentPreview",

                    controller: this,
                });

                if (this._vrExited) {
                    this._oAdminDocPreview.destroy();
                    this._oAdminDocPreview = null;
                    return;
                }
                this.getView().addDependent(this._oAdminDocPreview);
            }

            const oDialog = sap.ui.core.Fragment.byId(
                this.getView().getId(),
                "previewDialog",
            );

            const oImage = sap.ui.core.Fragment.byId(
                this.getView().getId(),
                "previewImage",
            );

            const oHtml = sap.ui.core.Fragment.byId(
                this.getView().getId(),
                "previewHtml",
            );

            oDialog.setTitle(sFileName);

            oImage.setVisible(false);
            oHtml.setVisible(false);
            oHtml.setContent("");

            // cleanup old blob
            if (this._pdfBlobUrl) {
                URL.revokeObjectURL(this._pdfBlobUrl);

                this._pdfBlobUrl = null;
            }

            // IMAGE PREVIEW
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

            // PDF PREVIEW
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

                const blob = new Blob(byteArrays, {
                    type: "application/pdf",
                });

                const sBlobUrl = URL.createObjectURL(blob);

                this._pdfBlobUrl = sBlobUrl;

                // Mobile Download
                if (sap.ui.Device.system.phone) {
                    const oLink = document.createElement("a");

                    oLink.href = sBlobUrl;
                    oLink.download = sFileName;
                    document.body.appendChild(oLink);
                    oLink.click();
                    document.body.removeChild(oLink);
                    sap.m.MessageToast.show("File downloaded successfully");
                    return;
                }

                const sIframe = `
            <div style="
                width:100%;
                height:100%;
                overflow:hidden;
                display:flex;
            ">

                <iframe
                    src="${sBlobUrl}#toolbar=0&navpanes=0&scrollbar=0"

                    style="
                        border:none;
                        width:100%;
                        height:100%;
                        display:block;
                        overflow:hidden;
                    "

                    scrolling="auto"
                    allowfullscreen>
                </iframe>

            </div>
            `;

                oDialog.setContentWidth("85%");
                oDialog.setContentHeight("90%");
                oHtml.setContent(sIframe);
                oHtml.setVisible(true);
                oDialog.open();
                return;
            }

            this.onDownloadPreview();

            sap.m.MessageToast.show("Preview not supported.");
        },

        onDownloadPreview: function () {
            if (!this._sPreviewBase64) {
                MessageToast.show("No file available for download.");

                return;
            }

            let sDownloadUrl = "";

            // PDF
            if (this._sPreviewMimeType === "application/pdf") {
                sDownloadUrl = this._pdfBlobUrl;
            }

            // IMAGE
            else if (this._sPreviewMimeType.startsWith("image/")) {
                sDownloadUrl = `data:${this._sPreviewMimeType};base64,${this._sPreviewBase64}`;
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

            if (this._oAdminDocPreview) {
                this._oAdminDocPreview.close();
                this._oAdminDocPreview.destroy();
                this._oAdminDocPreview = null;
            }
        },


        onAdminChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = this.byId("adminGender");
            // ðŸ”¥ Clear salutation error immediately
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
            // Dr. â†’ manual gender selection

            // âœ… Strict validation (CONTROL, not event)
            utils._LCstrictValidationSelect(oSalutation);
            oSalutation.bindProperty("valueStateText", "i18n>MVDsalutation");
            const oModel = this.getView().getModel("AdminSignupModel");
            oModel.setProperty("/Salutation", sKey);
            oModel.setProperty("/Gender", oGender.getSelectedKey());
            this._updateAdminSignupProgress();
        },
        ADMIN_onAddressChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sAddress = oInput.getValue();
            this.getView().getModel("AdminSignupModel").setProperty("/Address", sAddress);
            oInput.setValueState(sAddress.trim().length >= 10 ? "None" : "Error");
            oInput.bindProperty("valueStateText", "i18n>vrErrAddress");
            this._updateAdminSignupProgress();
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
                    this._stopHomeImageSlider();
                    oDialog.open();

                    this._supportRequestDialog.attachAfterClose(() => {
                        this.HF_onCancelButtonPress();
                        this._startHomeImageSlider();
                    });

                }.bind(this));

            } else {
                this._stopHomeImageSlider();
                this._supportRequestDialog.open();
            }

        },
        HF_onCancelButtonPress: function () {

            const oView = this.getView();

            // 1ï¸âƒ£ Clear model data
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

            // 2ï¸âƒ£ Clear uploaded images
            const oUploaderData = oView.getModel("UploaderData");
            if (oUploaderData) {
                oUploaderData.setProperty("/attachments", []);
            }

            // 3ï¸âƒ£ Clear tokens
            const oTokenModel = oView.getModel("tokenModel");
            if (oTokenModel) {
                oTokenModel.setProperty("/tokens", []);
            }

            // 4ï¸âƒ£ Reset ValueState
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

            // 5ï¸âƒ£ Clear file uploader
            const oUploader = sap.ui.getCore().byId(oView.createId("HFF_id_FileUploader1"));
            if (oUploader) {
                oUploader.clear();
            }

            // 6ï¸âƒ£ Close dialog
            this._supportRequestDialog.close();

        },
        onIssuenamechanges: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },
        onFileSizeExceed: function (oEvent) {
            const oFileUploader = oEvent.getSource();
            const sFileName = oEvent.getParameter("fileName");

            sap.m.MessageToast.show(`${sFileName} exceeds the 400 KB size limit.`);
        },
        onSupportrequestChange: async function (oEvent) {
            const oFiles = oEvent.getParameter("files");
            if (!oFiles || oFiles.length === 0) return;

            const oView = this.getView();
            const oUploaderData = oView.getModel("UploaderData");
            const oTokenModel = oView.getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            const totalAfterAdd = aAttachments.length + oFiles.length;
            if (totalAfterAdd > 3) {
                MessageToast.show("You can upload maximum 3 images only");
                oEvent.getSource().clear();
                return;
            }

            for (let i = 0; i < oFiles.length; i++) {
                const oFile = oFiles[i];

                const bDuplicate = aAttachments.some(file => file.originalFilename === oFile.name);
                if (bDuplicate) {
                    MessageToast.show("This file is already uploaded and cannot be uploaded again");
                    oEvent.getSource().clear();
                    return;
                }

                if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
                    MessageToast.show(`"${oFile.name}" is not a valid image. Only JPG, JPEG, PNG allowed`);
                    oEvent.getSource().clear();
                    return;
                }
            }

            const sIssueType = oView.getModel("SupportModel").getProperty("/IssueType") || "";
            const sBaseName = sIssueType || "support";
            const iExistingCount = aAttachments.filter(f =>
                new RegExp(`^${sBaseName} \\d+$`).test(f.filename)
            ).length;

            this.getBusyDialog();
            this._addSupportBusyProcessingRow();

            try {
                for (let i = 0; i < oFiles.length; i++) {
                    const oFile = oFiles[i];

                    let processedFile = oFile;
                    const MAX_SIZE_KB = 400;
                    const iMaxSizeBytes = MAX_SIZE_KB * 1024;
                    const isImage = oFile.type === "image/jpeg" || oFile.type === "image/jpg" || oFile.type === "image/png";

                    if (oFile.size > iMaxSizeBytes && isImage) {
                        if (typeof imageCompression === "undefined") {
                            throw new Error("Compression library missing");
                        }
                        const options = {
                            maxSizeMB: (MAX_SIZE_KB - 10) / 1024,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true,
                            initialQuality: 0.95
                        };
                        processedFile = await imageCompression(oFile, options);

                        if (processedFile.size > iMaxSizeBytes) {
                            throw new Error(oFile.name + " could not be compressed below 400 KB.");
                        }
                    }

                    const base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result.split(",")[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(processedFile);
                    });

                    const sFileName = `${sBaseName} ${iExistingCount + i + 1}`;

                    aAttachments.push({
                        originalFilename: oFile.name,
                        filename: sFileName,
                        fileType: oFile.type,
                        content: base64
                    });

                    aTokens.push({
                        key: sFileName,
                        text: sFileName
                    });
                }

                oUploaderData.setProperty("/attachments", aAttachments);
                oTokenModel.setProperty("/tokens", aTokens);
            } catch (err) {
                MessageToast.show(err.message || "Failed to process image.");
            } finally {
                this.closeBusyDialog();
                oEvent.getSource().clear();
            }
        },

        _addSupportBusyProcessingRow: function () {
            const oModel = this.getView().getModel("tokenModel");
            oModel.setData({
                tokens: [{
                    key: "processing",
                    text: "Compressing..."
                }]
            });
        },

        onTokenDelete: function (oEvent) {
            const oItem = oEvent.getParameter("listItem");
            if (!oItem) return;

            const oCtx = oItem.getBindingContext("tokenModel");
            if (!oCtx) return;

            const sKey = oCtx.getProperty("key");
            if (!sKey) return;

            const oUploaderData = this.getView().getModel("UploaderData");
            const oTokenModel = this.getView().getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            aAttachments = aAttachments.filter(file => file.filename !== sKey);
            aTokens = aTokens.filter(token => token.key !== sKey);

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
        ondoc: function () {
            this.getOwnerComponent().getRouter().navTo("RouteUploadDocs", {
                EncodedCustomerID: "R09MS0s0XzIwMjYvMjctMDEx",
                MemberID: "MDAwMDM="
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

                        var oHtml = Fragment.byId(
                            oView.getId(),
                            "termsPdfFrame"
                        );

                        if (!oHtml) {
                            throw new Error(
                                "termsPdfFrame was not found."
                            );
                        }

                        oHtml.addEventDelegate({
                            onAfterRendering: function () {
                                var oIframe = oHtml
                                    .getDomRef()
                                    .querySelector("iframe");

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
                var oDialog = Fragment.byId(
                    this.getView().getId(),
                    "termsDialog"
                );

                if (oDialog) {
                    oDialog.close();
                }
            },

            onTermsDialogClose: function () {
                this.byId("termsDialog").close();
            },

        
onUsermanualPress: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo("RouteUserManual", {
            flag: "hostel",
            branchId:"branchid"
        });
},

onPoliciesPress: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo("RoutePolicies");
},

        /**
         * Opens the policy whose id is carried by the pressed control, so one
         * handler serves every policy link in the footer.
         */
        onPolicyLinkPress: function (oEvent) {
            var sPolicyId = oEvent.getSource().data("policyId");

            if (sPolicyId) {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("RoutePoliciesTab", { policyId: sPolicyId });
            }
        },

        /**
         * The footer menu entries for the individual policies. Each item carries
         * its policy id in custom data, so the shared onPolicyLinkPress opens the
         * matching tab. Labels come from the same i18n keys the desktop links use.
         */
        _policyMenuItems: function () {
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            var aPolicies = [
                { id: "terms", key: "policyLinkTerms", icon: "sap-icon://document-text" },
                { id: "privacy", key: "policyLinkPrivacy", icon: "sap-icon://locked" },
                { id: "refund", key: "policyLinkRefund", icon: "sap-icon://undo" },
                { id: "vendor", key: "policyLinkVendor", icon: "sap-icon://home" },
                { id: "grievance", key: "policyLinkGrievance", icon: "sap-icon://comment" }
            ];

            return aPolicies.map(function (oPolicy) {
                var oItem = new sap.m.MenuItem({
                    text: oBundle.getText(oPolicy.key),
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

        // for 3dot on mobile device footer menu
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
            ].concat(this._policyMenuItems()).concat([
                new sap.m.MenuItem({
                    text: "Vendor Registration",
                    icon: "sap-icon://employee",
                    press: this.onAdminSIGNUP.bind(this)
                })
            ])
        });

        this.getView().addDependent(this._oFooterMenu);
    }

    this._oFooterMenu.openBy(oEvent.getSource());
},

onLanguagePress: function (oEvent) {
    var sLocale = oEvent.getSource().getSelectedKey();

    if (["en", "kn", "hi"].indexOf(sLocale) === -1) { return; }

    // Save selected language
    localStorage.setItem("selectedLanguage", sLocale);
    this._applyHostelLanguage(sLocale);
},

_applyHostelLanguage: function (sLocale) {
    var oView = this.getView();

    // Update SAPUI5 language configuration
    sap.ui.getCore().getConfiguration().setLanguage(sLocale);

    // Create the resource model for the selected language
    var oResourceModel = new sap.ui.model.resource.ResourceModel({
        bundleName: "sap.ui.com.project1.i18n.i18n",
        bundleLocale: sLocale
    });

    // Set the updated i18n model
    oView.setModel(oResourceModel, "i18n");


    // REBUILD THE STAYS ARRAY WITH THE NEW LANGUAGE BUNDLE


    // Update the resource bundle used in controller methods
    this.i18nModel = oResourceModel.getResourceBundle();
    this._updateStaysData(this.i18nModel);
    var oLanguageModel = oView.getModel("langageModel");
    if (oLanguageModel) {
        oLanguageModel.setProperty("/key", sLocale);
    } else {
        oView.setModel(new JSONModel({ key: sLocale }), "langageModel");
    }
    this._vrRefreshTexts();
},
onBuyHealthInsurance:function() {
            var oRouter = this.getOwnerComponent().getRouter();
            var sHash = oRouter.getURL("RouteHealthinsurance", {
                sPath:"Health"
            });
            var sUrl = window.location.origin + window.location.pathname + "#" + sHash;
            sap.m.URLHelper.redirect(sUrl, true);
},
onBuyTravelInsurance:function() {
                  var oRouter = this.getOwnerComponent().getRouter();
            var sHash = oRouter.getURL("RouteHealthinsurance", {
                sPath:"Travel"
            });
            var sUrl = window.location.origin + window.location.pathname + "#" + sHash;
            sap.m.URLHelper.redirect(sUrl, true);
    
},

        /* ==================================================================
         *  VENDOR REGISTRATION ("List your property")
         *
         *  Rendered by the five Vendor*.fragment.xml fragments from a Page
         *  inside Hostel.view.xml. The explorer uses pt/ptState; the inline
         *  signup uses the existing AdminSignupModel and HM_Login contract.
         * ================================================================== */

        /* ---------------------------------------------------------------- */
        /*  LIFECYCLE                                                       */
        /* ---------------------------------------------------------------- */

        _initVendorRegistration: function () {
            if (this._vrInitialized) {
                this._vrRefreshTexts();
                return;
            }
            this._vrInitialized = true;
            this._vrExited = false;

            this._vrInitPropertyTypes();
            this._vrHookPropertyTabs();
        },

        // Form models must not wait for translations or the property-type request.
        _vrT: function (sKey, aArgs) {
            var oComponent = this.getOwnerComponent(),
                oModel = this.getView().getModel("i18n") || (oComponent && oComponent.getModel("i18n")),
                oBundle = oModel && oModel.getResourceBundle();

            if (!oBundle) {
                return sKey;
            }
            if (typeof oBundle.getText === "function") {
                return oBundle.getText(sKey, aArgs);
            }

            var sLanguage = sap.ui.getCore().getConfiguration().getLanguage(),
                oRequest = this._vrBundleRequest;

            if (!oRequest || oRequest.model !== oModel || oRequest.language !== sLanguage) {
                oRequest = { model: oModel, language: sLanguage, bundle: null };
                this._vrBundleRequest = oRequest;
                Promise.resolve(oBundle).then(function (oResolved) {
                    if (!this._vrExited && this._vrBundleRequest === oRequest && oResolved && typeof oResolved.getText === "function") {
                        oRequest.bundle = oResolved;
                        this._vrRefreshTexts();
                    }
                }.bind(this)).catch(function () {
                    // Missing translations must not prevent the page models from initializing.
                });
            }
            return oRequest.bundle ? oRequest.bundle.getText(sKey, aArgs) : sKey;
        },

        _vrRefreshTexts: function () {
            var oView = this.getView(),
                oState = oView.getModel("ptState"),
                oPt = oView.getModel("pt");

            if (this._vrExited || !oState || !oPt) { return; }

            if (this._vrPropertyTypesSource) {
                // Resolve a fresh copy so switching languages never translates IDs
                // or loses the resource keys needed for the next language change.
                const localize = value => {
                    if (typeof value === "string") {
                        return value.startsWith("vrData") ? this._vrT(value) : value;
                    }
                    if (Array.isArray(value)) { return value.map(localize); }
                    if (value && typeof value === "object") {
                        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item)]));
                    }
                    return value;
                };
                const sId = oState.getProperty("/selectedId");
                const sMode = sId ? oState.getProperty("/mode") : undefined;
                oPt.setData(localize(this._vrPropertyTypesSource));
                const iIndex = oPt.getProperty("/types").findIndex(type => type.id === sId);
                this._vrShowPropertyType(iIndex < 0 ? 0 : iIndex, sMode, true);
            }
            oPt.setProperty("/loadError", this._vrTypesLoadFailed ? this._vrT("vrErrLoadTypes") : "");

            const oSignup = oView.getModel("AdminSignupModel");
            if (oSignup) {
                Object.entries(this._vrSignupMessages || {}).forEach(([sProperty, oMessage]) => {
                    if (oSignup.getProperty("/" + sProperty) === oMessage.text) {
                        oMessage.text = this._vrT(oMessage.key, oMessage.args);
                        oSignup.setProperty("/" + sProperty, oMessage.text);
                    } else {
                        delete this._vrSignupMessages[sProperty];
                    }
                });
                if (oSignup.getProperty("/Submitted")) {
                    const sSalutation = oSignup.getProperty("/Salutation") || "";
                    oSignup.setProperty("/SuccessMessage", this._vrT("registrationSubmittedMessage", [sSalutation, (oSignup.getProperty("/VendorName") || "").trim()]));
                }
                oSignup.refresh(true);
            }
        },

        _vrSetSignupMessage: function (sProperty, sKey, aArgs) {
            const oModel = this.getView().getModel("AdminSignupModel");
            if (!oModel || this._vrExited) { return; }
            this._vrSignupMessages = this._vrSignupMessages || {};
            const sText = sKey ? this._vrT(sKey, aArgs) : "";
            if (sKey) {
                this._vrSignupMessages[sProperty] = { key: sKey, args: aArgs, text: sText };
            } else {
                delete this._vrSignupMessages[sProperty];
            }
            oModel.setProperty("/" + sProperty, sText);
        },

        /* ---------------------------------------------------------------- */
        /*  MODEL INIT                                                      */
        /* ---------------------------------------------------------------- */

        _vrInitPropertyTypes: function () {
            var oView = this.getView(),
                oPt   = new JSONModel({ types: [], benefits: [], loadError: "" });

            oView.setModel(oPt, "pt");
            oView.setModel(new JSONModel({
                selectedId: "",
                name:       "",
                who:        "",
                headline:   "",
                blurb:      "",
                mode:       "multi",
                isSingle:   false,
                path:       [],
                points:     [],
                nodes:      [],
                more:       "",
                ctaText:    ""
            }), "ptState");

            oPt.attachRequestCompleted(function (oEvent) {
                if (this._vrExited) { return; }

                var aTypes = oPt.getProperty("/types"),
                    aBenefits = oPt.getProperty("/benefits") || [];

                this._vrTypesLoadFailed = oEvent.getParameter("success") === false || !Array.isArray(aTypes) || !aTypes.length;
                if (this._vrTypesLoadFailed) {
                    this._vrPropertyTypesSource = null;
                    oPt.setData({ types: [], benefits: [] });
                    this._vrRefreshTexts();
                    return;
                }

                aTypes.concat(aBenefits).forEach(function (oItem) {
                    // SAP icon-font URIs (sap-icon://...) are used as they are;
                    // anything else is a path relative to the app root.
                    if (String(oItem.icon).indexOf("sap-icon://") !== 0) {
                        oItem.icon = sap.ui.require.toUrl("sap/ui/com/project1/" + oItem.icon);
                    }
                });
                this._vrPropertyTypesSource = { types: aTypes, benefits: aBenefits };
                this._vrRefreshTexts();
            }.bind(this));

            oPt.loadData(sap.ui.require.toUrl("sap/ui/com/project1/model/vendorPropertyTypes.json"));
        },

        /* ---------------------------------------------------------------- */
        /*  PROPERTY TYPE EXPLORER                                          */
        /* ---------------------------------------------------------------- */

        _vrShowPropertyType: function (iIndex, sMode, bRefreshTexts) {
            var oPt    = this.getView().getModel("pt"),
                oState = this.getView().getModel("ptState"),
                aTypes = oPt.getProperty("/types") || [];

            var oType = aTypes[iIndex];
            if (!oType) { return; }

            // Each type opens on its own default mode; the toggle can override it.
            var sActiveMode = sMode || oType.defaultMode || "multi",
                bSingle     = sActiveMode === "single",
                oMore       = oType.more || {},
                // Only the tree differs between the two modes; name, description,
                // path and points are the same for both. Knowing whether the type
                // really changed lets the mode toggle leave the detail column
                // alone instead of rebuilding and re-animating it.
                bTypeChanged = oState.getProperty("/selectedId") !== oType.id;

            this._vrPtIndex = iIndex;

            // Set the detail properties only when the type changed. Writing the
            // same values back would still replace the path/points arrays and make
            // the bound lists on the right re-render.
            if (bTypeChanged || bRefreshTexts) {
                oState.setProperty("/selectedId", oType.id);
                oState.setProperty("/name", oType.name);
                oState.setProperty("/who", oType.who);
                oState.setProperty("/headline", oType.headline || "");
                oState.setProperty("/blurb", oType.blurb);
                oState.setProperty("/path", oType.path);
                oState.setProperty("/points", oType.points);
                oState.setProperty("/ctaText", this._vrT("vrPtCta", [oType.name]));
            }

            oState.setProperty("/mode", sActiveMode);
            oState.setProperty("/isSingle", bSingle);
            oState.setProperty("/nodes", (bSingle ? oType.single : oType.multi) || []);
            oState.setProperty("/more", bSingle ? oMore.single : oMore.multi);

            this._vrSyncPropertyTabs();
            this._vrSyncModeToggle();
            if (!bRefreshTexts) { this._vrAnimateExplorer(bTypeChanged); }
        },

        // Fades in whatever the swap actually replaced. A type change replaces the
        // tree and the detail column, so both are faded; a mode toggle only
        // replaces the tree, so the detail column is left untouched.
        _vrAnimateExplorer: function (bDetailChanged) {
            var oPanel = this.byId("vendorTypePanel"),
                oDom   = oPanel && oPanel.getDomRef();

            if (!oDom) { return; }

            // The class has to be dropped and the style recalculated, otherwise a
            // repeat toggle keeps the finished animation and shows no transition.
            oDom.classList.remove("svSwapping", "svSwappingTree");
            void oDom.offsetWidth;
            oDom.classList.add(bDetailChanged ? "svSwapping" : "svSwappingTree");

            clearTimeout(this._vrSwapTimer);
            this._vrSwapTimer = setTimeout(function () {
                oDom.classList.remove("svSwapping", "svSwappingTree");
            }, 470);
        },

        onModeSingle: function () {
            this._vrShowPropertyType(this._vrPtIndex, "single");
        },

        onModeMulti: function () {
            this._vrShowPropertyType(this._vrPtIndex, "multi");
        },

        onSelectPropertyType: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("pt");
            if (oCtx) {
                this._vrShowPropertyType(parseInt(oCtx.getPath().split("/").pop(), 10));
            }
        },

        _vrHookPropertyTabs: function () {
            var oTabs = this.byId("vendorTypeTabs");
            if (!oTabs || this._vrExited || this._vrTypeTabs === oTabs) { return; }

            if (this._vrTypeTabs) {
                this._vrTypeTabs.removeEventDelegate(this._vrTypeDelegate);
            }
            this._vrTypeTabs = oTabs;
            this._vrTypeDelegate = {
                onAfterRendering: function () {
                    this._vrSyncPropertyTabs();
                    this._vrSyncModeToggle();
                },
                onkeydown: function (oEvent) {
                    if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(oEvent.key) === -1 || oEvent.altKey || oEvent.ctrlKey || oEvent.metaKey) {
                        return;
                    }

                    var aButtons = oTabs.getItems(),
                        iCurrent = aButtons.findIndex(function (oButton) {
                            var oDom = oButton.getDomRef();
                            return oDom && oDom.contains(oEvent.target);
                        });
                    if (iCurrent < 0) { return; }

                    var iNext = oEvent.key === "Home" ? 0 : oEvent.key === "End" ? aButtons.length - 1 :
                        (iCurrent + (oEvent.key === "ArrowRight" ? 1 : -1) + aButtons.length) % aButtons.length,
                        oNext = aButtons[iNext],
                        oCtx = oNext.getBindingContext("pt");

                    if (!oCtx) { return; }
                    oEvent.preventDefault();
                    oEvent.stopPropagation();
                    this._vrShowPropertyType(parseInt(oCtx.getPath().split("/").pop(), 10));
                    oNext.focus();
                }
            };
            oTabs.addEventDelegate(this._vrTypeDelegate, this);
            this._vrSyncPropertyTabs();
        },

        _vrSyncPropertyTabs: function () {
            var oTabs = this._vrTypeTabs,
                oState = this.getView().getModel("ptState");
            if (!oTabs || !oState) { return; }

            var sId = oState.getProperty("/selectedId");
            oTabs.getItems().forEach(function (oButton) {
                var oCtx = oButton.getBindingContext("pt"),
                    bSelected = !!oCtx && oCtx.getProperty("id") === sId;

                // A ToggleButton toggles itself off even when the active type is pressed again.
                oButton.setPressed(bSelected);
                var oDom = oButton.getFocusDomRef();
                if (oDom) { oDom.setAttribute("tabindex", bSelected ? "0" : "-1"); }
            });
        },

        _vrSyncModeToggle: function () {
            var oToggle = this.byId("vendorModeToggle"),
                oState  = this.getView().getModel("ptState");
            if (!oToggle || !oState) { return; }

            // The buttons are declared single-first and toggle themselves off when
            // the already active one is pressed, so the pressed state is re-asserted
            // from the model instead of relying on the click.
            var bSingle  = oState.getProperty("/mode") === "single",
                aButtons = oToggle.getItems();

            if (aButtons[0]) { aButtons[0].setPressed(bSingle); }
            if (aButtons[1]) { aButtons[1].setPressed(!bSingle); }
        },

        onPtCtaPress: function () {
            // The explorer keeps the type and mode the visitor chose; the CTA only
            // takes them to the registration form.
            this._vrScrollTo("register");
        },

        onBackHome: function () {
            var oTabHeader = this.byId("mainTabHeader");
            if (!oTabHeader) { return; }

            var oItem = oTabHeader.getItems().filter(function (i) {
                return i.getKey() === "idHome";
            })[0];

            if (!oItem) { return; }

            oTabHeader.setSelectedKey("idHome");
            this.onTabSelect({
                getParameter: function () { return oItem; }
            });
        },

        /* ---------------------------------------------------------------- */
        /*  HELPERS                                                         */
        /* ---------------------------------------------------------------- */

        onScrollToRegister: function () {
            this._vrScrollTo("register");
        },

        _vrScrollTo: function (sId) {
            var oCtrl = this.byId(sId);

            if (oCtrl && oCtrl.getDomRef()) {
                oCtrl.getDomRef().scrollIntoView({ behavior: "smooth", block: "start" });
            }
        },

        _vrScrollToTop: function () {
            var oPage = this.byId("idVendor");

            if (oPage && oPage.scrollTo) {
                oPage.scrollTo(0, 0);
            }
        }

    });
});
