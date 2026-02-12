sap.ui.define([
	 "./BaseController",
	"../model/formatter",
    "sap/ui/model/json/JSONModel",
	 "sap/m/MessageToast",
], function(
	BaseController,
	Formatter,
	JSONModel,
	MessageToast
		
) {
	"use strict";

	return BaseController.extend("sap.ui.com.project1.controller.View_Rooms", {
            Formatter: Formatter,
		    onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteViewRooms").attachMatched(this._onRouteMatched, this);

			},
			_onRouteMatched:async function (oEvent) {

				    var model = new JSONModel({
                   BedTypes: [],
                    NoData: false,
                    ShowViewMore: false

            });
            this.getView().setModel(model, "VisibilityModel")

              var sPath = oEvent.getParameter("arguments").sPath;
			  sap.ui.core.BusyIndicator.show(0);
			  await this._loadFilteredData(sPath) 
			  sap.ui.core.BusyIndicator.hide();

			   

				
				
			},
			  model: function (response) {
            const aRooms = response.data.HM_Rooms || [];
            const oRoomModel = new JSONModel({ Rooms: aRooms });
            this.getView().setModel(oRoomModel, "RoomCountModel");

            const aCustomers = Array.isArray(response.data.HM_RoomData) ? response.data.HM_RoomData : [response.data.HM_RoomData];

            const oCustomerModel = new JSONModel(aCustomers);
            this.getView().setModel(oCustomerModel, "CustomerModel");
        },
			 
       _loadFilteredData: async function (sBranchCode) {
            const oView = this.getView();
            const oVisibilityModel = oView.getModel("VisibilityModel")

         

            try {

              

                let response;
                response = await this.ajaxReadWithJQuery("BookingBedTypeRoomReadCall", {
                    BranchCode: sBranchCode,
                    top: this.iTop,
                    skip: this.iSkip
                });
                await this.model(response)

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
                        Visible: isVisible,
                        AvailbleBeds: room.AvailableRooms,
                        Address: sAddress,
                        CheckInTime: sCheckInTime,
                        CheckOutTime: sCheckOutTime,
                        GSTType: sGSTType,
                        GSTValue: sGSTValue,
                        GSTIN: sGSTIN,
                        AverageRating: AverageRating,
                        TotalFeedbacks: TotalFeedbacks,
                        GeoLocation: oBranchInfo?.GeoLocation || ""
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


                aFinal = aFinal.filter(b => b.PriceVisible !== false);

                oVisibilityModel.setProperty("/BedTypes", aFinal);
                oVisibilityModel.setProperty("/ShowViewMore", aFinal.length !== HM_RoomCount);
                if (oView.getModel("VisibilityModel").getData().BedTypes.length === 0) {
                    oView.getModel("VisibilityModel").setProperty("/NoData", true);
                } else {
                    oView.getModel("VisibilityModel").setProperty("/NoData", false);
                }
               } catch (err) {
                         console.log(err);
                         

                // MessageToast.show(this.i18nModel.getText("failedloadbedtypedata"));
            }
        },
		   onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        onHome: function () {
			var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
	});
});