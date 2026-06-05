sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], function (BaseController, Formatter, JSONModel, MessageToast, MessageBox, utils, Filter, FilterOperator) {
    "use strict";
    const $C = (id) => sap.ui.getCore().byId(id);
    this._otpResendInterval = null;
    this._otpValidityInterval = null;
    return BaseController.extend("sap.ui.com.project1.controller.View_Rooms", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteViewRooms").attachMatched(this._onRouteMatched, this);
        },

        onAfterRendering: function () {
            var oRatingHBox = this.byId("VR_id_RatingClickable");
            if (oRatingHBox && !this._ratingClickAttached) {
                this._ratingClickAttached = true;
                var oDomRef = oRatingHBox.getDomRef();
                if (oDomRef) {
                    var self = this;
                    $(oDomRef).on("click", function (e) {
                        if (!$(e.target).closest(".vrRatingCount").length) {
                            self.onRatingPress();
                        }
                    });
                }
            }
        },
        _onRouteMatched: async function (oEvent) {
            // this.getBusyDialog()
            // if (performance.navigation && performance.navigation.type === 1) {
            //     var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            //     oRouter.navTo("RouteHostel", {}, true);
            // }
            // this._ViewDatePickersReadOnly(["idBookingDate"], sap.ui.getCore());

            // Clear the HostelModel when returning to this view
            const oHostelModel = this.getView().getModel("HostelModel");
            if (oHostelModel) {
                oHostelModel.setData({});
            }

            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            var model = new JSONModel({
                BedTypes: [],
                NoData: false,
                ShowViewMore: false

            });
            this.getView().setModel(model, "VisibilityModel")

            //           if (!this._oBookingDateDialog) {
            //     this._oBookingDateDialog = await sap.ui.core.Fragment.load({
            //         name: "sap.ui.com.project1.fragment.BookingDate",
            //         controller: this
            //     });
            //     this.getView().addDependent(this._oBookingDateDialog);
            // } 
            //           sap.ui.getCore().byId("idBookingDate").setValue("").setMinDate(new Date()).setValueState("None")
            //           this.getView().byId("VR_id_JoiningDate").setValue("").setMinDate(new Date())

            //        this.getView().addStyleClass("blurView")
            //        this._oBookingDateDialog.open();

            this.sPath = oEvent.getParameter("arguments").sPath;
            this.getOwnerComponent().setModel(new JSONModel({Branch: this.sPath }), "sPathModel");

            // Fetch branch data for the specific BranchID
            await this._loadBranchData();

            await this._loadFilteredData()
            this.closeBusyDialog()
            const oView = this.getView();
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
              oView.setModel(new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: "",
                minDate: new Date(2000, 0, 1)
            }), "LoginMode");
              // Add only your required properties (safe, isolated)
            this.oViewModel.setProperty("/loginMode", "password"); // "password" or "otp"
            this.oViewModel.setProperty("/showOTPField", false); // show OTP input box only after Send OTP success
            this.oViewModel.setProperty("/isOtpEntered", false); // enable Sign In only when OTP entered

        },
        model: function (response) {
            const aRooms = response.data.HM_Rooms || [];
            const oRoomModel = new JSONModel({ Rooms: aRooms });
            this.getView().setModel(oRoomModel, "RoomCountModel");

            const aCustomers = Array.isArray(response.data.HM_RoomData) ? response.data.HM_RoomData : [response.data.HM_RoomData];

            const oCustomerModel = new JSONModel(aCustomers);
            this.getView().setModel(oCustomerModel, "CustomerModel");
        },
         onChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender =sap.ui.getCore().byId("signUpGender");
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

        Bookingdatepress: async function () {

            if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idBookingDate"), "ID")) {
                await this._loadFilteredData()
                this.getView().removeStyleClass("blurView")
                this._oBookingDateDialog.close();
                this.getView().byId("VR_id_JoiningDate").setValue(sap.ui.getCore().byId("idBookingDate").getValue())
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"))

            }
        },
        Viewroom_onPressClear: function () {
            this.getView().byId("VR_id_JoiningDate").setValue("")
        },
        onBookingDateCancel: function () {
            this._oBookingDateDialog.close();
            this.getView().removeStyleClass("blurView")

        },
        onDatePickerChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");

        },

        _loadBranchData: async function () {
            const oView = this.getView();
            const sBranchID = this.sPath;

            try {
                // Fetch branch data filtered by BranchID from HM_Branch backend endpoint
                const oResponse = await this.ajaxReadWithJQuery("HM_Branch", {
                    BranchID: sBranchID
                });

                // Set the filtered branch data to BranchModel
                const aBranchData = oResponse?.data || [];
                const oBranchModel = new JSONModel(aBranchData[0] || {});
                oView.setModel(oBranchModel, "BranchModel");
            } catch (error) {
                console.error("Error loading branch data:", error);
                // Set empty model on error
                oView.setModel(new JSONModel({}), "BranchModel");
            }
        },

        _loadFilteredData: async function () {
            const oView = this.getView();
            const oVisibilityModel = oView.getModel("VisibilityModel")

            var sBranchCode = this.sPath

            // var Date=this.byId("VR_id_JoiningDate").getValue() || sap.ui.getCore().byId("idBookingDate").getValue()
            try {
                this.getBusyDialog();
                oVisibilityModel.setProperty("/isDataLoaded", false);
                let response;
                response = await this.ajaxReadWithJQuery("BookingBedTypeRoomReadCall", {
                    // JoiningDate:Date,
                    BranchCode: sBranchCode,
                });
                await this.model(response)
                oVisibilityModel.setProperty("/isDataLoaded", true);
                this.closeBusyDialog();


                let matchedRooms = response.data.HM_BedType || [];
                let HM_RoomCount = response.data.HM_RoomCount

                const oRoomDetailsModel = oView.getModel("RoomCountModel");
                const oCustomerModel = oView.getModel("CustomerModel");

                const roomDetails = oRoomDetailsModel.getData()?.Rooms || [];
                const customerData = oCustomerModel.getData() || [];


                const oBranchModel = oView.getModel("sBRModel");
                const aBranchData = oBranchModel?.getData() || [];

                // Direct URL approach - backend should provide imageUrl
                const getImageUrl = (base64String, fileType) => {
                    if (!base64String) return "./image/Fallback.png";
                    // If base64 is already a data URL, keep it (fallback)
                    if (base64String.startsWith("data:image")) return base64String;
                    // For now, we'll assume backend provides direct URLs via imageUrl property
                    // Return a placeholder; actual URL should be set in room object from backend
                    return null;
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
                    const AverageRating = firstRoom?.AverageRating ? " " + firstRoom.AverageRating : "0";
                    const TotalFeedbacks = firstRoom?.TotalFeedbacks ? " " + firstRoom.TotalFeedbacks : "0";

                    const isVisible = room?.Status === "Available";

                    const PriceVisible = price !== "" || MonthPrice !== "" || YearPrice !== ""


                    const oBranchInfo = aBranchData.find(b =>
                        b.BranchID?.toLowerCase() === room.BranchCode?.toLowerCase()
                    );
                    // const sLogo = oBranchInfo?.Photo1 ? `data:${oBranchInfo.Photo1Type};base64,${oBranchInfo.Photo1}` : "";
                    const sArea = oBranchInfo?.Name || "";
                    const sAddress = oBranchInfo?.Address || "";
                    const sCountry = oBranchInfo?.Country || "";
                    const sGSTType = oBranchInfo?.Type || "";
                    const sGSTValue = oBranchInfo?.Value || "";
                    const sGSTIN = oBranchInfo?.GSTIN || "";
                    const sCheckInTime = oBranchInfo?.CheckinTime || "";
                    const sCheckOutTime = oBranchInfo?.CheckoutTime || "";
                    const LandMark = oBranchInfo?.LandMark || "";
                    const PropertyType = oBranchInfo?.PropertyType || ""; 
                    const PropertySTD = oBranchInfo.STD || "";
                    const PropertyMobileNo = oBranchInfo.Contact || "";
                    const PropertyEmail = oBranchInfo.EmailID || "";


                    const aImages = [];
                    for (let i = 1; i <= 5; i++) {
                        const base64 = room[`Photo${i}`];
                        const type = room[`Photo${i}Type`];
                        if (base64) {
                           // Direct URL approach: assume backend provides imageUrl property
                           // For now, we'll create a URL that points to a PHP script that streams the image
                           // The src will be set to a URL like api/get_image.php?id=...&photoIndex=i
                           // Since we don't have the image ID, we'll fallback to data URL if needed
                           let src = null;
                           if (room[`Photo${i}Url`]) {
                               src = room[`Photo${i}Url`];
                           } else if (base64.startsWith("data:image")) {
                               src = base64; // keep existing data URL
                           } else {
                               // Fallback to data URL (temporary until backend provides URLs)
                               src = `data:${type || 'image/jpeg'};base64,${base64}`;
                           }
                           aImages.push({
                               src: src,
                               Area: sArea,
                               AverageRating: AverageRating,
                               TotalFeedbacks: TotalFeedbacks,
                               BranchCode: room.BranchCode,
                               Name: room.Name,
                               ACType: room.ACType,
                           });
                       }
                   }
                    return {
                        Name: room.Name,
                        ACType: room.ACType,
                        NoOfPerson: room.NoOfPerson,
                        Description: room.Description || "",
                        Deposit: room.Deposit || "",
                        DepositCurrency: room.DepositCurrency || "",
                        Price: price,
                        BasicPrice: BasicPrice,
                        MonthPrice: MonthPrice,
                        YearPrice: YearPrice,
                        Currency: Currency,
                        BranchCode: room.BranchCode,
                        Images: aImages,
                        Country: sCountry,
                        PriceVisible: PriceVisible,
                        Visible: true,
                        AvailbleBeds: 2,
                        Address: sAddress,
                        CheckInTime: sCheckInTime,
                        CheckOutTime: sCheckOutTime,
                        GSTType: sGSTType,
                        GSTValue: sGSTValue,
                        GSTIN: sGSTIN,
                        AverageRating: AverageRating,
                        TotalFeedbacks: TotalFeedbacks,
                        GeoLocation: oBranchInfo?.GeoLocation || "",
                        EmailID: oBranchInfo?.EmailID || "",
                        AvailableDate: Date,
                        ExtraBed: room.ExtraBed,
                        LandMark: LandMark, 
                        PropertyType: PropertyType || room.PropertyType || "",
                        PropertySTD: PropertySTD,
                        PropertyMobileNo: PropertyMobileNo,
                        PropertyEmail: PropertyEmail
                    };
                });

                const aExisting = oVisibilityModel.getProperty("/BedTypes") || [];
                let aFinal;

                aFinal = aBedTypes;



                aFinal = aFinal.filter(b => b.PriceVisible !== false);
                const aACRooms = aFinal.filter(r =>
                    r.ACType?.toLowerCase() === "ac"
                );

                const NonACRooms = aFinal.filter(r =>
                    r.ACType?.toLowerCase() === "non-ac"
                );
                const bHasAC = aACRooms.length > 0;
                const bHasNonAC = NonACRooms.length > 0;
                oVisibilityModel.setProperty("/BedTypes", aFinal);
                oVisibilityModel.setProperty("/ACRooms", aACRooms);
                oVisibilityModel.setProperty("/NonACRooms", NonACRooms);
                oVisibilityModel.setProperty("/ShowGlobalNoData", !bHasAC && !bHasNonAC);
                oVisibilityModel.setProperty("/ShowViewMore", aFinal.length !== HM_RoomCount);
                this._restartRoomCardCarouselsAutoSlide();
            } catch (err) {
                console.log(err);
                oVisibilityModel.setProperty("/isDataLoaded", false);
            }
        },
        onExit: function () {
            this._stopRoomCardCarouselsAutoSlide();

            if (this._roomCardCarouselStartTimeout) {
                clearTimeout(this._roomCardCarouselStartTimeout);
                this._roomCardCarouselStartTimeout = null;
            }

            if (BaseController.prototype.onExit) {
                BaseController.prototype.onExit.apply(this, arguments);
            }
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
                    Area: oSelected.Images?.[0]?.Area,   // hostel's name
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
                    AvailableDate: oSelected.AvailableDate,
                    ExtraBed: oSelected.ExtraBed || 0,
                    PropertyType: oSelected.PropertyType || "",
                    PropertySTD: oSelected.PropertySTD || "",
                    PropertyMobileNo: oSelected.PropertyMobileNo || "",
                    PropertyEmail: oSelected.PropertyEmail || ""
                    
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
        onCloseRoomDetail: function () {
            if (this._oRoomDetailFragment) this._oRoomDetailFragment.close();
            this._clearRoomDetailDialog();
            this._pendingBookingNav = false;
        },

        onDialogAfterClose: function () {
            if (this._oRoomDetailFragment) this._oRoomDetailFragment.close(); // close FIRST
            this._clearRoomDetailDialog();
        },
        _clearRoomDetailDialog: function () {
            if (!this._oRoomDetailFragment) return;

            const oFrag = this._oRoomDetailFragment;

            // Stop carousel first
            this._stopRoomImageCarousel();

            if (this._carouselResumeTimeout) {
                clearTimeout(this._carouselResumeTimeout);
                this._carouselResumeTimeout = null;
            }

            oFrag.findAggregatedObjects(true, obj =>
                obj.hasStyleClass && obj.hasStyleClass("priceItem")
            ).forEach(item => {
                item.removeStyleClass("selectedTile");
                item.addStyleClass("defaultTile");
            });

            const oCarousel = sap.ui.core.Fragment.byId(
                "roomDetailsFrag",
                "roomImageCarousel"
            );

            if (oCarousel) {
                oCarousel.destroyPages();
            }

            const oCard = oFrag.findAggregatedObjects(
                true,
                obj => obj.isA && obj.isA("sap.ui.integration.widgets.Card")
            )[0];

            if (oCard && oCard.refresh) {
                oCard.refresh();
            }

            ["HostelModel", "FacilityModel"].forEach(name => {
                const m = oFrag.getModel(name);
                if (m) m.setData({});
            });

            oFrag.close();
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
            // this.getView().addStyleClass("blur-background");
            this._oSignDialog.open();
        },

      onDialogClose: function () {
    this._resetOtpState();
    this._pendingBookingNav = false;

    if (this._oSignDialog) {
        this._oSignDialog.close();
        this._oSignDialog.destroy();
        this._oSignDialog = null;
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
        _resetAllAuthFields: function () {
            ["signInEmail", "signinPassword", "fpEmailId", "fpOTP", "newPass", "confPass", "loginOTP"]
                .forEach(id => {
                    let o = $C(id);
                    if (o) o.setValue("");
                });
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
         _clearOtpResendTimer: function () {
            if (this._otpResendInterval) {
                clearInterval(this._otpResendInterval);
                this._otpResendInterval = null;
            }
        },
        _clearOtpValidityTimer: function () {
            if (this._otpValidityInterval) {
                clearInterval(this._otpValidityInterval);
                this._otpValidityInterval = null;
            }
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

        onShowForgotUser: function () {
            this._showForgotSection("secForgotUser")
        },
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
                localStorage.setItem("isLoggedIn", "true");

                localStorage.setItem("_x9A1p", user._x9A1p);
                localStorage.setItem("_k7LmQ", user._k7LmQ);

                localStorage.setItem("_aB39X", btoa(user.UserID));
                localStorage.setItem("_mN72P", btoa(user.UserName));
                  
                // Role Based Access
                if (user.Role === "Customer") {
                    const oUserModel = new JSONModel(user);
                    sap.ui.getCore().setModel(oUserModel, "LoginModel");
                    this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", true);
                } else {
                    this.getOwnerComponent().getRouter().navTo("TilePage");
                }
                MessageToast.show(this.i18nModel.getText("Login Successful"));

                // Reset login fields
                $C("signInEmail").setValue("");
                $C("signinPassword").setValue("");
                $C("signInOTP").setValue("");
                // Close dialog
                if (this._oSignDialog) this._oSignDialog.close(),this._oSignDialog.destroy();
        this._oSignDialog = null;
                if (this._pendingBookingNav) {
                    this._pendingBookingNav = false;
                    this.onConfirmBooking();
                }
            } catch (err) {
                MessageToast.show(err.message || "Invalid credentials, please try again");
            } finally {
                this.closeBusyDialog();
            }
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
            //  STRICT validation while typing
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
            this.oViewModel.setProperty("/forgotStep", 1);
            this.oViewModel.setProperty("/dialogTitle", "Set / Reset Password");
            this._addPasswordGenerateIcon();

            ["fpEmailId", "fpOTP", "newPass", "confPass"].forEach(id => {
                const c = $C(id);
                if (c) c.setEnabled(true);
            });
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

        onConfirmBooking: async function () {
            const oUIModel = this.getOwnerComponent().getModel("UIModel");
            const bLoggedIn = localStorage.getItem("isLoggedIn");

            const oLoginModel = sap.ui.getCore().getModel("LoginModel");
            const oUser = oLoginModel?.getData?.() || {};

            // -------------------------
            // LOGIN CHECK
            // -------------------------
            if (!bLoggedIn) {
                this._pendingBookingNav = true;
                MessageBox.information(
                    "Please log in to continue booking.",
                    {
                        title: "Login Required",
                        styleClass: "myUnifiedBtn",
                        actions: [MessageBox.Action.OK],
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: function () {
                            this.onpressLogin();
                        }.bind(this)
                    }
                );
                return;
            }

            const oView = this.getView();
            const oLocalModel = this.oHostelModel;
            const oData = oLocalModel?.getData?.() || {};

            let aMember = [];

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
                PropertyType: oData.PropertyType || "",
                PropertySTD: oData.PropertySTD || "",
                PropertyMobileNo: oData.PropertyMobileNo || "",
                PropertyEmail: oData.PropertyEmail || "",
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
                AvailableDate: oData.AvailableDate,
                ExtraBed: oData.ExtraBed || 0,
                MemberList: aMember
            };

            // -------------------------
            // MERGE WITH GLOBAL MODEL
            // -------------------------
            // Add UserID to the data for background loading on booking page
            const oMergedData = {
                ...oGlobalModel.getData(),
                ...oBookingData,
                UserID: oUser?.UserID || ""
            };

            // -------------------------
            // AVAILABLE BEDS LOGIC
            // -------------------------
            const iAvailableBeds = parseInt(oMergedData.AvailbleBeds, 10) || 0;

            if (iAvailableBeds <= 0) {
                MessageToast.show(
                    this.i18nModel.getText("nobedsavailableforbooking")
                );
                return;
            }

            // Apply busy dialog while routing to booking page
            this.getBusyDialog();

            // Close the busy dialog once the booking route finishes matching
            const oBookingRoute = this.getOwnerComponent().getRouter().getRoute("RouteBooking");
            const fnCloseBusy = function () {
                this.closeBusyDialog();
                oBookingRoute.detachMatched(fnCloseBusy, this);
            };
            oBookingRoute.attachMatched(fnCloseBusy, this);

            const aPersonsList = [];
            for (let i = 1; i <= iAvailableBeds; i++) {
                aPersonsList.push({
                    key: i.toString(),
                    text: i.toString()
                });
            }

            oMergedData.NoOfPersonsList = aPersonsList;

            // Default selection = max beds
            oMergedData.SelectedPerson =
                aPersonsList[aPersonsList.length - 1]?.key || "1";
            oGlobalModel.setData(oMergedData, true);

            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close();
            }

            this._clearRoomDetailDialog();
            const oHostelModel = this.getView().getModel("HostelModel");
            if (!oHostelModel) {
                oHostelModel.setData({});
            }
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBooking");
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
        _updateBookTileState: function () {

            const oTile =
                sap.ui.core.Fragment.byId("roomDetailsFrag", "bookTile");

            if (!oTile) return;

            const bOccupied =
                !this.oHostelModel.getProperty("/Visible");

            if (bOccupied) {
                oTile.addStyleClass("occupied");
            } else {
                oTile.removeStyleClass("occupied");
            }
        }, 
        _startRoomCardCarouselsAutoSlide: function (iDelay = 3000) {
            if (!this._roomCardCarouselTimers) {
                this._roomCardCarouselTimers = new Map();
            }

            const aCarousels = this.getView().findAggregatedObjects(true, function (oControl) {
                return oControl.isA &&
                    oControl.isA("sap.m.Carousel") &&
                    oControl.hasStyleClass &&
                    oControl.hasStyleClass("roomCardCarousel");
            });

            aCarousels.forEach(function (oCarousel) {
                if (!oCarousel || oCarousel.bIsDestroyed) return;

                const aPages = oCarousel.getPages();
                if (!aPages || aPages.length <= 1) return;

                const sCarouselId = oCarousel.getId();

                // Do not create duplicate timers
                if (this._roomCardCarouselTimers.has(sCarouselId)) return;

                const iTimer = setInterval(function () {
                    if (!oCarousel || oCarousel.bIsDestroyed) {
                        clearInterval(iTimer);
                        this._roomCardCarouselTimers.delete(sCarouselId);
                        return;
                    }

                    const aCurrentPages = oCarousel.getPages();
                    if (!aCurrentPages || aCurrentPages.length <= 1) return;

                    if (typeof oCarousel.next === "function") {
                        oCarousel.next();
                        return;
                    }

                    // Fallback if next() is not available
                    const sActivePageId = oCarousel.getActivePage();
                    const iCurrentIndex = aCurrentPages.findIndex(function (oPage) {
                        return oPage.getId() === sActivePageId || oPage === sActivePageId;
                    });

                    const iNextIndex =
                        iCurrentIndex >= 0
                            ? (iCurrentIndex + 1) % aCurrentPages.length
                            : 0;

                    oCarousel.setActivePage(aCurrentPages[iNextIndex]);
                }.bind(this), iDelay);

                this._roomCardCarouselTimers.set(sCarouselId, iTimer);
            }.bind(this));
        },

        _stopRoomCardCarouselsAutoSlide: function () {
            if (!this._roomCardCarouselTimers) return;

            this._roomCardCarouselTimers.forEach(function (iTimer) {
                clearInterval(iTimer);
            });

            this._roomCardCarouselTimers.clear();
        },

        _restartRoomCardCarouselsAutoSlide: function () {
            this._stopRoomCardCarouselsAutoSlide();

            if (this._roomCardCarouselStartTimeout) {
                clearTimeout(this._roomCardCarouselStartTimeout);
            }

            this._roomCardCarouselStartTimeout = setTimeout(function () {
                requestAnimationFrame(function () {
                    this._startRoomCardCarouselsAutoSlide(3000);
                }.bind(this));
            }.bind(this), 300);
        },
        _bindCarousel: function () {
            const oCarousel = sap.ui.core.Fragment.byId(
                "roomDetailsFrag",
                "roomImageCarousel"
            );

            if (!oCarousel) return;

            // Stop old timer before rebinding
            this._stopRoomImageCarousel();

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

            const aImgs =
                this._oRoomDetailFragment
                    ?.getModel("HostelModel")
                    ?.getProperty("/ImageList") || [];

            if (aImgs.length <= 1) return; // nothing to rotate

            // Wait until binding/rendering settles
            setTimeout(() => {
                this._startRoomImageCarousel(oCarousel, 3000);
            }, 0);

            // Attach interaction pause only once
            if (!oCarousel._roomCarouselPauseAttached) {
                const fnPause = () => {
                    this._stopRoomImageCarousel();

                    if (this._carouselResumeTimeout) {
                        clearTimeout(this._carouselResumeTimeout);
                    }

                    this._carouselResumeTimeout = setTimeout(() => {
                        this._startRoomImageCarousel(oCarousel, 3000);
                    }, 10000);
                };

                oCarousel.attachBrowserEvent("touchstart", fnPause);
                oCarousel.attachBrowserEvent("mousedown", fnPause);

                oCarousel._roomCarouselPauseAttached = true;
            }
        },

        _startRoomImageCarousel: function (oCarousel, iDelay = 3000) {
            if (!oCarousel || oCarousel.bIsDestroyed) return;

            this._stopRoomImageCarousel();

            this._carouselInterval = setInterval(() => {
                if (!oCarousel || oCarousel.bIsDestroyed) {
                    this._stopRoomImageCarousel();
                    return;
                }

                const aPages = oCarousel.getPages();

                if (!aPages || aPages.length <= 1) return;

                // Prefer native next() if available
                if (typeof oCarousel.next === "function") {
                    oCarousel.next();
                    return;
                }

                // Fallback: manually set next active page
                const sActivePageId = oCarousel.getActivePage();
                const iCurrentIndex = aPages.findIndex(page =>
                    page.getId() === sActivePageId || page === sActivePageId
                );

                const iNextIndex =
                    iCurrentIndex >= 0
                        ? (iCurrentIndex + 1) % aPages.length
                        : 0;

                oCarousel.setActivePage(aPages[iNextIndex]);
            }, iDelay);
        },

        _stopRoomImageCarousel: function () {
            if (this._carouselInterval) {
                clearInterval(this._carouselInterval);
                this._carouselInterval = null;
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
                "Others": "../image/defaultFacility.png",
                "Extra Pillow" : "../image/pillow.jpg"
            };

            return list
                .map(f => {

                    // Price logic
                    let price = 0;
                    let unit = "";

                    const hasUnitPrice = parseFloat(f.UnitPrice) > 0;
                    const hasMinimumPrice = parseFloat(f.MinimumPrice) > 0;

                    if (hasUnitPrice) {
                        price = f.UnitPrice;
                        unit = "Unit Price";
                    } else if (hasMinimumPrice) {
                        price = f.MinimumPrice;
                        unit = f.FacilityChargeType
                            ? `Minimum / ${f.FacilityChargeType}`
                            : "Minimum Price";
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

                        UnitPrice: f.UnitPrice || "0",
                        MinimumPrice: f.MinimumPrice || "0.00",
                        MinimumQty: f.MinimumQty || 0,
                        FacilityChargeType: f.FacilityChargeType || "",

                        Image: hasImage
                            ? `data:${f.Photo1Type || "image/jpeg"};base64,${f.Photo1}`
                            : defaultImages[name] || "../image/defaultFacility.png"
                    };
                })
                .filter(Boolean); // remove null
        },
        _LoadFacilities: async function (sBranchCode) {

            const oModel = this.getView().getModel("HostelModel").getData();
            const oExtraBed = oModel.ExtraBed || 0;
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
                    const fType = (f.Type || "").trim().toLowerCase();

                    const typeMatch = validTypesLower.includes(f.Type || "");

                    // ✅ Extra Bed condition
                    if (fType === "extra bed") {
                        return typeMatch && oExtraBed > 0;
                    }

                    // ✅ All other facilities
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
        _LoadAmenities: async function (sBranchCode) {

            const oAmenityModel = new JSONModel({
                loading: true,
                Amenities: [],
                BranchCode: sBranchCode  // Store for reference
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
                    validTypes.includes((x.Type || "").toLowerCase())  // Match Type/AmenityType
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
                        `data:${item.Photo1Type || "image/jpeg"};base64,${item.Photo1}` :
                        defaultImages[amenityType] || "./images/default.png"
                };
            });
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

        onRatingPress: function () {
            var oBranchModel = this.getView().getModel("BranchModel");
            var oBranchData = oBranchModel ? oBranchModel.getData() : {};
            var oSelectedBedType = this.getOwnerComponent().getModel("SelectedBedType");
            if (!oSelectedBedType) {
                oSelectedBedType = new sap.ui.model.json.JSONModel({});
                this.getOwnerComponent().setModel(oSelectedBedType, "SelectedBedType");
            }
            oSelectedBedType.setData({
                BranchID: oBranchData.BranchID || oBranchData.BranchCode || "",
                Name: oBranchData.Name || "",
                BranchCode: oBranchData.BranchID || oBranchData.BranchCode || "",
                fromRoute: "RouteViewRooms",
                fromRoutePath: this.sPath
            });
            this.getOwnerComponent().getRouter().navTo("RouteCustomerReview");
        },

        onNavBack: function () {
            const sTabKey = "idRooms"
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
            sessionStorage.setItem("homePageReturnTab", sTabKey);
        },

        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        onViewDetailsPress: function (oEvent) {
            if (this._oEnquiry?.isOpen()) {
                this._oEnquiry.close();
            }
            this.viewDetails(oEvent);
        },

        onEnquiryPress: function (oEvent) {
            var oData = oEvent.getSource().getBindingContext("VisibilityModel").getObject();
            this.oData = oEvent.getSource().getBindingContext("VisibilityModel").getObject();

            const oEnquiryModel = new sap.ui.model.json.JSONModel({
                RoomType: oData.Name + " (" + oData.ACType + ")",
                Salutation: "",
                UserName: "",
                STDCode: "+91",
                Mobile: "",
                Comments: "",
                Email: ""
            });

            this.getView().setModel(oEnquiryModel, "EnquiryModel");

            if (!this._oEnquiry) {
                this._oEnquiry = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sap.ui.com.project1.fragment.Enquiry",
                    this
                );
                this.getView().addDependent(this._oEnquiry);
            }
            this._oEnquiry.open();
            this.byId("id_enq_MobileNo").setMaxLength(10)
        },

        E_onCancelButtonPress: function () {
            this._clearEnquiryStates();
            this._oEnquiry.close();
        },

        E_onsavebuttonpress: async function (oEvent) {
            var Data = this.oData
            var oView = this.getView();
            const oModel = oView.getModel("EnquiryModel").getData();
            const oEmail = oView.getModel("sBRModel").getData().find((item) => {
                return item.BranchID === Data.BranchCode;
            });
            const oBranch = oModel.RoomType;
            var isMandatoryValid = (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("id_Salutation")), "ID") &&
                utils._LCvalidateName(sap.ui.getCore().byId(oView.createId("id_enq_Name")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("id_enq_STD")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("id_enq_MobileNo")), "ID") &&
                utils._LCvalidateEmail(sap.ui.getCore().byId(oView.createId("id_enq_Email")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("id_enq_Comments")), "ID")

            );
            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            const isMobileValid = this._validateMobileNumber();
            if (!isMobileValid) {
                sap.m.MessageToast.show("Enter valid mobile number");
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            var oData = {
                BranchName: oEmail.Name,
                RoomType: oModel.RoomType,
                BranchCreatedEmailID: oEmail.EmailID,
                CustomerName: (oModel.Salutation || "") + " " + (oModel.UserName || ""),
                CustomerEmail: oModel.Email || "",
                CustomerPhone: (oModel.STDCode || "") + oModel.Mobile,
                CustomerComment: oModel.Comments || ""
            };
            this.getBusyDialog();
            try {
                const oresponse = await this.ajaxCreateWithJQuery("HM_EnquiryEmail", {
                    data: oData,

                });
                sap.m.MessageBox.success(
                    "Your enquiry has been submitted successfully.\n\nOur team will contact you soon.",
                    {
                        title: "Request Submitted",
                        actions: [sap.m.MessageBox.Action.OK],
                        emphasizedAction: sap.m.MessageBox.Action.OK,
                        styleClass: "myUnifiedBtn",
                        onClose: function () {
                            if (this._oEnquiry && this._oEnquiry.isOpen()) {
                                this._oEnquiry.close();
                            }
                            this._clearEnquiryStates();
                        }.bind(this)
                    }
                );
                const oResult = oresponse?.data || {};
                this._oEnquiry.close();
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        onAdminLiveValidate: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },

        onmailvalidate: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateEmail(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        _validateMobileNumber: function () {
            const oMobile = this.byId("id_enq_MobileNo");
            const oSTD = this.byId("id_enq_STD");

            const sSTD = oSTD.getSelectedKey();
            const sValue = (oMobile.getValue() || "").replace(/\D/g, "");

            oMobile.setValue(sValue);

            // ISD mandatory
            if (!sSTD) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("Select ISD code");
                return false;
            } else {
                oSTD.setValueState("None");
            }

            // Mobile mandatory
            if (!sValue) {
                oMobile.setValueState("Error");
                oMobile.setValueStateText("Mobile number is required");
                return false;
            }

            // INDIA VALIDATION
            if (sSTD === "+91") {

                if (sValue.length !== 10) {
                    oMobile.setValueState("Error");
                    oMobile.setValueStateText("Indian mobile number must be exactly 10 digits");
                    return false;
                }
                if (sValue.startsWith("0")) {
                    oMobile.setValueState("Error");
                    oMobile.setValueStateText("Indian mobile number cannot start with 0");
                    return false;
                }

            }
            // OTHER COUNTRIES
            else {

                if (sValue.length < 4 || sValue.length > 18) {
                    oMobile.setValueState("Error");
                    oMobile.setValueStateText("Mobile number must be between 4 and 18 digits");
                    return false;
                }

            }
            oMobile.setValueState("None");
            oMobile.setValueStateText("");
            return true;
        },

        ADMIN_onMobileLiveChange: function () {
            this._validateMobileNumber();
        },

        ADMIN_onChangeSTD: function (oEvent) {
            const oSTD = oEvent.getSource();
            const oMobile = this.byId("id_enq_MobileNo");
            oMobile.setValue("")
            const sKey = oSTD.getSelectedKey();
            const sMobileValue = (oMobile.getValue() || "").trim();

            if (!sKey) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("Please select ISD code");
                return;
            }

            oSTD.setValueState("None");
            oSTD.setValueStateText("");

            if (sKey === "+91") {
                oMobile.setMaxLength(10);
            } else {
                oMobile.setMaxLength(18);
            }

            // Only validate if mobile already has value
            if (sMobileValue) {
                this._validateMobileNumber();
            } else {
                oMobile.setValueState("None");
                oMobile.setValueStateText("");
            }
        },

        onAdminChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            oSalutation.setValueState("None");
            oSalutation.setValueStateText("");
            utils._LCstrictValidationSelect(oSalutation);
        },

        onEnqCommentsChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        _clearEnquiryStates: function () {
            if (!this._oEnquiry) return;
            const aControls = this._oEnquiry.findAggregatedObjects(true, function (oControl) {
                return oControl.setValueState;
            });
            aControls.forEach(function (oControl) {
                oControl.setValueState("None");
            });
        }
    });
});