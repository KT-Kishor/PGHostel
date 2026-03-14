sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
], function (BaseController, Formatter, JSONModel, MessageToast, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.View_Rooms", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteViewRooms").attachMatched(this._onRouteMatched, this);

        },
        _onRouteMatched: async function (oEvent) {
            if (performance.navigation && performance.navigation.type === 1) {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteHostel", {}, true);
            }
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

            await this._loadFilteredData()

        },
        model: function (response) {
            const aRooms = response.data.HM_Rooms || [];
            const oRoomModel = new JSONModel({ Rooms: aRooms });
            this.getView().setModel(oRoomModel, "RoomCountModel");

            const aCustomers = Array.isArray(response.data.HM_RoomData) ? response.data.HM_RoomData : [response.data.HM_RoomData];

            const oCustomerModel = new JSONModel(aCustomers);
            this.getView().setModel(oCustomerModel, "CustomerModel");
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

        _loadFilteredData: async function () {
            const oView = this.getView();
            const oVisibilityModel = oView.getModel("VisibilityModel")

            var sBranchCode = this.sPath

            // var Date=this.byId("VR_id_JoiningDate").getValue() || sap.ui.getCore().byId("idBookingDate").getValue()
            try {
                this.getView().setBusy(true);
                oVisibilityModel.setProperty("/isDataLoaded", false);
                let response;
                response = await this.ajaxReadWithJQuery("BookingBedTypeRoomReadCall", {
                    // JoiningDate:Date,
                    BranchCode: sBranchCode,
                });
                await this.model(response)
                oVisibilityModel.setProperty("/isDataLoaded", true);
                this.getView().setBusy(false);


                let matchedRooms = response.data.HM_BedType || [];
                let HM_RoomCount = response.data.HM_RoomCount

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
                    const aImages = [];
                    for (let i = 1; i <= 5; i++) {
                        const base64 = room[`Photo${i}`];
                        const type = room[`Photo${i}Type`];
                        if (base64) {
                            aImages.push({
                                src: convertBase64ToImage(base64, type),
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
                        ExtraBed: room.ExtraBed
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
            } catch (err) {
                console.log(err);
                oVisibilityModel.setProperty("/isDataLoaded", false);
            }
        },
        viewDetails: function (oEvent) {
            try {
                const oView = this.getView();
                const oSelected = oEvent.getSource().getBindingContext("VisibilityModel").getObject();
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
                    BranchCode: oSelected.BranchCode || "",
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
                    ExtraBed: oSelected.ExtraBed || 0

                };

                const oHostelModel = new JSONModel(oFullDetails);
                oView.setModel(oHostelModel, "HostelModel");
                this.oHostelModel = oHostelModel;

                oView.setModel(new JSONModel({
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
                console.log(" viewDetails error:", err);
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
                ExtraBed: oData.ExtraBed || 0

            };

            // -------------------------
            // MERGE WITH GLOBAL MODEL
            // -------------------------
            const oMergedData = {
                ...oGlobalModel.getData(),
                ...oBookingData
            };

            // -------------------------
            //  FIX: NO OF PERSONS BASED ON AVAILABLE BEDS
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
            oRouter.navTo("RouteBookRoom");
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
                "Others": "../image/defaultFacility.png"
            };

            return list
                .map(f => {

                    // Price logic
                    let price = 0;
                    let unit = "";

                    if (parseFloat(f.PerHourPrice) > 0) {
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
                    const name = (f.Type || "").trim();

                    return {
                        FacilityID: f.ID,
                        FacilityName: name,
                        Price: price,
                        UnitText: unit,
                        Currency: f.Currency || "INR",

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
                let resp = await this.ajaxReadWithJQuery("HM_Facilities", {});
                let allFacilities = resp?.data || [];

                // Get static types
                const oStaticModel = this.getView().getModel("FacilityType");
                const staticTypes = oStaticModel ? oStaticModel.getData() : [];
                const validTypesLower = staticTypes.map(t => (t.FacilityName || ""));

                // Case-insensitive filter
                const branchFacilities = allFacilities.filter(f => {
                    const fBranch = (f.BranchCode || "").trim();
                    const fType = (f.Type || "").trim().toLowerCase();

                    const branchMatch = fBranch === sBranchCode.trim();
                    const typeMatch = validTypesLower.includes(f.Type || "");

                    // ✅ Extra Bed condition
                    if (fType === "extra bed") {
                        return branchMatch && typeMatch && oExtraBed > 0;
                    }

                    // ✅ All other facilities
                    return branchMatch && typeMatch;
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
                let resp = await this.ajaxReadWithJQuery("HM_HostelFeatures", {});
                let allList = resp?.data || [];

                // Filter: strict BranchCode AND Type in static amenities
                const oStaticModel = this._oRoomDetailFragment.getModel("AmenitiType");
                const staticTypes = oStaticModel ? oStaticModel.getData() : [];
                const validTypes = staticTypes.map(t => t.AmenitiName.toLowerCase());

                const branchAmenities = allList.filter(x =>
                    (x.BranchCode || "").trim() === (sBranchCode || "").trim() &&
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
            oMobile.setValue(sValue);
            this.getView().getModel("EnquiryModel").setProperty("/Mobile", sValue);

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
            const sKey = oSTD.getSelectedKey();
            const sMobileValue = (oMobile.getValue() || "").trim();

            if (!sKey) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("Please select ISD code");
                return;
            }

            oSTD.setValueState("None");
            oSTD.setValueStateText("");

            // if (sKey === "+91") {
            //     oMobile.setMaxLength(10);
            // } else {
            //     oMobile.setMaxLength(18);
            // }

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