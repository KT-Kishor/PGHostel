sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/FlexBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Image",
    "sap/ui/core/HTML"
], (Controller, JSONModel, Formatter, utils, MessageToast, MessageBox, Dialog, Button, Image, HTML) => {
    "use strict";
    return Controller.extend("sap.ui.com.project1.controller.Book_RoomSummary", {
        Formatter: Formatter,
        onInit() {
            this.i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            // var oBtn = this.byId("couponApplyBtn");
            // oBtn.setText("Apply Now")
            // oBtn.setVisible(true);
            // var inputID = this.getView().byId("BookingcouponInput")
            // inputID.setShowValueHelp(false)

            var DateModel = new JSONModel({
                minstartDate: "",
                minEndDate: ""
            });
            this.getView().setModel(DateModel, "DateRangeModel");

        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomePage");
        },

        onTableSelection: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) {
                MessageToast.show(this.i18nModel.getText("noRowSelected"));
                return;
            }

            this._oSelectedTable = oEvent.getSource();

            const oContext = oSelectedItem.getBindingContext("HostelModel");
            if (!oContext) {
                MessageToast.show(this.i18nModel.getText("selectionhasnoBindingContext"));
                return;
            }

            const oSelectedData = oContext.getObject();
            this._oSelectedFacility = oSelectedData;
            this._sSelectedPath = oContext.getPath();

            //  Get BranchCode of the selected facility
            const sBranch = oSelectedData.Branch || "";
            console.log("Selected Facility BranchCode:", sBranch);

            // Parse index from path
            let idx = -1;
            try {
                const parts = this._sSelectedPath.split("/");
                idx = parseInt(parts[parts.length - 1], 10);
                if (isNaN(idx)) idx = -1;
            } catch (e) {
                idx = -1;
            }

            this._oSelectedIndex = idx;
        },
        onDeleteFacility: function () {
            if (!this._oSelectedFacility) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRowDelete"));
                return;
            }

            sap.m.MessageBox.confirm(
                this.i18nModel.getText("msgBoxConfirmDelete"),
                {
                    title: this.i18nModel.getText("msgBoxConfirm"),
                    actions: [
                        sap.m.MessageBox.Action.OK,
                        sap.m.MessageBox.Action.CANCEL
                    ],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    styleClass: "myUnifiedBtn",
                    onClose: function (sAction) {
                        var Table = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
                        if (Table) {
                            // remove selection
                            try {
                                Table.removeSelections(true);
                            } catch (e) {
                                /* ignore */
                            }
                            const oBinding = Table.getBinding("items");
                            if (oBinding) oBinding.refresh();
                        }

                        if (sAction === sap.m.MessageBox.Action.OK) {
                            this._executeFacilityDelete();
                        }
                    }.bind(this)
                }
            );
        },
        _executeFacilityDelete: function () {

            if (!this._oSelectedFacility) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRowDelete"));
                return;
            }

            const oModel = this.getView().getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons") || [];
            const paymentType =
                String(oModel.getProperty("/SelectedPriceType") || "")
                    .trim();


            // FIND PERSON + FACILITY INDEX

            let iPersonIndex = -1;
            let iFacilityIndex = -1;

            aPersons.some((p, pIdx) => {
                const idx = (p.AllSelectedFacilities || [])
                    .findIndex(f => f === this._oSelectedFacility);

                if (idx > -1) {
                    iPersonIndex = pIdx;
                    iFacilityIndex = idx;
                    return true;
                }
                return false;
            });

            if (iPersonIndex === -1) {
                MessageToast.show("Selected facility not found");
                return;
            }

            /* ==================================
            REMOVE FACILITY
            ================================== */
            aPersons[iPersonIndex].AllSelectedFacilities.splice(iFacilityIndex, 1);
            /* ==================================
        ALSO REMOVE FROM SelectedFacilities
        ================================== */
            const aSelected =
                aPersons[iPersonIndex].Facilities?.SelectedFacilities || [];

            const selIdx = aSelected.findIndex(
                f => f.FacilityName === this._oSelectedFacility.FacilityName
            );

            if (selIdx > -1) {
                aSelected.splice(selIdx, 1);
            }


            /* ==================================
     RECALCULATE ONLY THIS PERSON
     ================================== */
            const oPerson = aPersons[iPersonIndex];

            const parseDate = v => {
                if (typeof v === "string" && v.includes("/")) {
                    const [d, m, y] = v.split("/");
                    return new Date(+y, +m - 1, +d);
                }
                return new Date(v);
            };

            const oStart = parseDate(oModel.getProperty("/StartDate"));
            const oEnd = parseDate(oModel.getProperty("/EndDate"));



            const bookingMonths =
                Number(oModel.getProperty("/SelectedMonths")) || 1;

            const bookingYears =
                Math.max(1, oEnd.getFullYear() - oStart.getFullYear());

            const bookingDays =
                Math.floor((oEnd - oStart) / 86400000);

            /* ---- Facility totals (per facility units) ---- */
            oPerson.Facilities.SelectedFacilities.forEach(f => {

                f.UnitText = f.SelectedPriceType; // normalize

                if (f.UnitText === "Per Month") {
                    f.SelectedMonths = bookingMonths;
                    f.TotalMonths = bookingMonths;
                }

                if (f.UnitText === "Per Year") {
                    f.TotalYears = bookingYears;
                }

                if (f.UnitText === "Per Day") {
                    f.TotalDays = bookingDays;
                }

                f.TotalAmount = this._calculateFacilityTotal(
                    f,
                    bookingDays,
                    bookingMonths,
                    bookingYears
                );
            });

            /* ---- Facility total sum ---- */
            oPerson.TotalFacilityPrice = oPerson.Facilities.SelectedFacilities.reduce(
                (s, f) => s + (Number(f.TotalAmount) || 0),
                0
            );

            /* ---- Room rent ---- */
            const baseRoomRent = Number(oModel.getProperty("/FinalPrice")) || 0;

            let roomRent = 0;

            switch (paymentType) {

                case "Per Day":
                    roomRent = baseRoomRent * bookingDays;
                    break;

                case "Per Month":
                    roomRent = baseRoomRent * bookingMonths;
                    break;

                case "Per Year":
                    roomRent = baseRoomRent * bookingYears;
                    break;

            }



            oPerson.RoomRentPerPerson = roomRent;
            oPerson.SubTotal = roomRent + oPerson.TotalFacilityPrice;

            /* ---- GST (dynamic) ---- */
            const sGSTType = oModel.getProperty("/GSTType");
            const sGSTValue = oModel.getProperty("/GSTValue");

            let cgst = 0, sgst = 0, igst = 0;

            if (sGSTType === "CGST/SGST") {

                const gstPercent = Number(sGSTValue) || 0;

                cgst = oPerson.SubTotal * (gstPercent) / 100;
                sgst = oPerson.SubTotal * (gstPercent) / 100;

            } else if (sGSTType === "IGST") {

                const gstPercent = Number(sGSTValue) || 0;

                igst = oPerson.SubTotal * gstPercent / 100;
            }

            oPerson.CGST = Number(cgst.toFixed(2));
            oPerson.SGST = Number(sgst.toFixed(2));
            oPerson.IGST = Number(igst.toFixed(2));

            oPerson.FinalTotalCost =
                Number((
                    oPerson.SubTotal +
                    oPerson.CGST +
                    oPerson.SGST +
                    oPerson.IGST
                ).toFixed(2));

        
            let divisor = 1;


            if (paymentType === "Per Month" || paymentType === "Per Year") {
                divisor = bookingMonths > 0 ? bookingMonths : 1;
            }

            const monthlyCost = oPerson.FinalTotalCost / divisor;

            oPerson.MonthlyCostPerPerson = Number(monthlyCost.toFixed(2));
            oPerson.MonthlyCostPerson = Number(monthlyCost.toFixed(2));

            /* ==================================
            GRAND TOTAL (ONCE)
            ================================== */
            const grandTotal = aPersons.reduce(
                (sum, p) => sum + (Number(p.FinalTotalCost) || 0),
                0
            );

            aPersons.forEach(p => p.GrandTotal = grandTotal);

            oModel.setProperty("/Persons", aPersons);
            oModel.setProperty("/GrandTotal", grandTotal.toFixed(2));
            oModel.setProperty("/IsInitialCalculationDone", true);
            oModel.setProperty("/IsFacilitySelectionDirty", true);

            /* ==================================
        FIX SERVICE CARD HIGHLIGHT
        ================================== */
            setTimeout(() => {

                const selected =
                    aPersons[iPersonIndex].Facilities.SelectedFacilities || [];

                $(".serviceCard").each(function () {

                    const domId = $(this).attr("id");
                    const ctrl = sap.ui.getCore().byId(domId);
                    if (!ctrl) return;

                    const ctx = ctrl.getBindingContext("FacilityModel");
                    if (!ctx) return;

                    const facObj = ctx.getObject();

                    const stillSelected = selected.some(
                        f => f.FacilityName === facObj.FacilityName
                    );

                    if (stillSelected) {
                        ctrl.addStyleClass("serviceCardSelected");
                    } else {
                        ctrl.removeStyleClass("serviceCardSelected");
                    }
                });

            }, 120);


            oModel.refresh(true);

            /* ==================================
            CLEANUP
            ================================== */
            this._oSelectedFacility = null;
            this._oSelectedTable = null;
            this._sSelectedPath = null;

            MessageToast.show(this.i18nModel.getText("facilityDeletedSuccessfully"));
        },



        // --- Open edit dialog for selected facility ---
        onEditFacilityDetails: function () {

            const oHostelData = this.getView().getModel("HostelModel").getData();

            // Set min/max date ranges
            this.getView().getModel("DateRangeModel")
                .setProperty("/minstartDate",
                    new Date(oHostelData.StartDate.split("/").reverse().join("-"))
                );

            this.getView().getModel("DateRangeModel")
                .setProperty("/minEndDate",
                    new Date(oHostelData.EndDate.split("/").reverse().join("-"))
                );

            // -----------------------------
            // VALIDATION
            // -----------------------------
            if (!this._oSelectedFacility) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRowEdit"));
                return;
            }

            // -----------------------------
            // SAFE COPY OF SELECTED FACILITY
            // -----------------------------
            const oSafeCopy = JSON.parse(
                JSON.stringify(this._oSelectedFacility)
            );
            delete oSafeCopy.SelectedMonths;

            // =================================================
            // DERIVE TOTAL MONTHS / YEARS FOR DROPDOWN
            // =================================================
            if (oSafeCopy.StartDate && oSafeCopy.EndDate) {

                const parseDate = (s) => {
                    if (typeof s === "string" && s.includes("/")) {
                        const [d, m, y] = s.split("/");
                        return new Date(+y, +m - 1, +d);
                    }
                    return new Date(s);
                };

                const oStart = parseDate(oSafeCopy.StartDate);
                const oEnd = parseDate(oSafeCopy.EndDate);

                const iMonths =
                    (oEnd.getFullYear() - oStart.getFullYear()) * 12 +
                    (oEnd.getMonth() - oStart.getMonth()) || 1;

                const iYears =
                    Math.max(1, oEnd.getFullYear() - oStart.getFullYear());

                if (oSafeCopy.UnitText === "Per Month") {
                    oSafeCopy.SelectedMonths = String(
                        oSafeCopy.TotalMonths || iMonths
                    );
                    oSafeCopy.TotalMonths = Number(oSafeCopy.SelectedMonths);
                    oSafeCopy.TotalYears = 0;
                }

                if (oSafeCopy.UnitText === "Per Year") {
                    oSafeCopy.SelectedMonths = String(
                        oSafeCopy.TotalYears || iYears
                    );
                    oSafeCopy.TotalYears = Number(oSafeCopy.SelectedMonths);
                    oSafeCopy.TotalMonths = 0;
                }
            }


            this._oEditModel = new JSONModel(oSafeCopy);
            this.getView().setModel(this._oEditModel, "edit");

            // =================================================
            // LOAD DIALOG IF NEEDED
            // =================================================
            if (!this._oEditDialog) {
                this._oEditDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sap.ui.com.project1.fragment.FacilitiTableUpdate",
                    this
                );
                this.getView().addDependent(this._oEditDialog);

            }

            // Assign model
            this._oEditDialog.setModel(this._oEditModel, "edit");
            this._sPrevEditStartDate =
                this._oEditModel.getProperty("/StartDate");

            // Filter rate types
            this._filterRateTypesForEdit(this._oSelectedFacility);

            // Open dialog
            this._oEditDialog.open();
        }
        ,

        _resetEditValueStates: function () {
            const aControlIds = [
                "FT_id_editFacilityName",
                "FT_id_UnitType",
                "FT_id_editStartTime",
                "FT_id_editEndTime",
                "editTotalTime",
                "FT_id_editPrice",
                "FT_id_Currency",
                "FT_id_editStartDate",
                "FT_id_editEndDate",
                "FT_id_editDays"
            ];

            aControlIds.forEach(sId => {
                const oControl = sap.ui.core.Fragment.byId(
                    this.getView().getId(),
                    sId
                );

                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            });
        },

        onEditDialogAfterOpen: function () {
            this._resetEditValueStates();
        },

        _filterRateTypesForEdit: function () {
            const sBranchCode = this._oSelectedFacility.BranchCode || this._oSelectedFacility.Branch || "";
            const aFacilities = this.getView().getModel("FacilityModel").getProperty("/Facilities") || [];

            const oFacilityData = aFacilities.find(f =>
                f.FacilityName === this._oSelectedFacility.FacilityName &&
                f.BranchCode === sBranchCode
            );

            if (!oFacilityData) {
                console.error("Facility not found:", this._oSelectedFacility);
                MessageToast.show(this.i18nModel.getText("facilityDataMissing"));
                return;
            }

            const oRateTypeModel = this.getOwnerComponent().getModel("RateType");

            if (!this._aOriginalRateTypes) {
                this._aOriginalRateTypes = JSON.parse(JSON.stringify(oRateTypeModel.getData()));
            }

            // 🔹 Booking Duration selection
            const sSelectedPriceType =
                this.getView().getModel("HostelModel").getProperty("/SelectedPriceType");

            // 🔹 Allowed units based on Booking Duration
            let aAllowed = [];

            if (sSelectedPriceType === "Per Day") {
                aAllowed = ["Per Hour", "Per Day"];
            }
            else if (sSelectedPriceType === "Per Month") {
                aAllowed = ["Per Hour", "Per Day", "Per Month"];
            }
            else if (sSelectedPriceType === "Per Year") {
                aAllowed = ["Per Hour", "Per Day", "Per Month", "Per Year"];
            }

            // 🔹 Price mapping
            const priceMapping = {
                "Per Hour": Number(oFacilityData.PricePerHour),
                "Per Day": Number(oFacilityData.PricePerDay),
                "Per Month": Number(oFacilityData.PricePerMonth),
                "Per Year": Number(oFacilityData.PricePerYear)
            };

            // ✅ FINAL FILTER (Allowed by duration + price > 0)
            const aFiltered = this._aOriginalRateTypes.filter(rt =>
                aAllowed.includes(rt.RateType) && priceMapping[rt.RateType] > 0
            );

            oRateTypeModel.setData(aFiltered);
        },

        _parsePossibleDateString: function (s) {
            if (!s) return null;
            // If already a Date
            if (s instanceof Date) return s;
            // If format is yyyy-MM-dd (common when valueFormat used)
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                const parts = s.split("-");
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
            // If format dd/MM/yyyy
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
                const parts = s.split("/");
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
            // Fallback: try Date.parse
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
        },

        onEditDialogClose: function () {
            const oView = this.getView();
            const oTable = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
            if (oTable) {
                // remove selection
                try {
                    oTable.removeSelections(true);
                } catch (e) {
                    /* ignore */
                }
                const oBinding = oTable.getBinding("items");
                if (oBinding) oBinding.refresh();
            }

            // Clear selection cache
            this._oSelectedTable = null;
            this._oSelectedFacility = null;
            this._oSelectedIndex = null;
            this._sSelectedPath = null;
            this._oEditDialog.close();
        },

        onMonthSelectionChange: function (oEvent) {

            const oEditModel = this.getView().getModel("edit");
            const oHostelModel = this.getView().getModel("HostelModel");
            const sUnit = oEditModel.getProperty("/UnitText");
            const sStartDate = oEditModel.getProperty("/StartDate");
            // Store previous values for rollback
            this._iPrevSelectedMonths =
                oEditModel.getProperty("/SelectedMonths");

            this._sPrevEditEndDate =
                oEditModel.getProperty("/EndDate");

            if (!sStartDate) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectStartDateFirst"));
                return;
            }

            const iCount = parseInt(oEvent.getSource().getSelectedKey(), 10) || 1;

            const oStart = this._parseDate(sStartDate);
            if (!(oStart instanceof Date) || isNaN(oStart)) {
                MessageToast.show(this.i18nModel.getText("invalidStartDate"));
                return;
            }

            let oEnd = new Date(oStart);

            // ------------------------------------------------
            //  FIND CURRENT FACILITY
            // ------------------------------------------------
            const sPath = this._sSelectedPath;
            const iPersonIndex = parseInt(sPath.split("/")[2], 10);
            const iFacilityIndex = parseInt(sPath.split("/")[4], 10);

            const oFacility =
                oHostelModel.getProperty("/Persons/" + iPersonIndex +
                    "/AllSelectedFacilities/" + iFacilityIndex);

            if (!oFacility) {
                return;
            }

  // ------------------------------------------------
// CALCULATE END DATE
// ------------------------------------------------
const iOriginalDay = oStart.getDate();  // ✅ CRITICAL: Store start day

if (sUnit === "Per Month") {
    oEnd.setMonth(oEnd.getMonth() + iCount);
    oEnd.setDate(iOriginalDay - 1);  // 10th → 9th of next month
    
    oFacility.TotalMonths = iCount;
    oFacility.TotalYears = 0;
    oFacility.SelectedMonths = iCount;
    oFacility.IsDurationEdited = true;
    const aPersons = oHostelModel.getProperty("/Persons");
    aPersons[iPersonIndex].SelectedMonths = iCount;
} 
else if (sUnit === "Per Year") {  // ✅ Use else if
    oEnd.setFullYear(oEnd.getFullYear() + iCount);
    oEnd.setDate(iOriginalDay - 1);
    
    oFacility.TotalYears = iCount;
    oFacility.TotalMonths = 0;
    oFacility.IsDurationEdited = true;
    const aPersons = oHostelModel.getProperty("/Persons");
    aPersons[iPersonIndex].SelectedYears = iCount;
}




            const iTotalDays =
                Math.floor((oEnd - oStart) / 86400000);

            // ------------------------------------------------
            //  UPDATE BOTH MODELS (UI + DATA)
            // ------------------------------------------------
            oFacility.TotalDays = iTotalDays;
            /* ===============================
   VALIDATE AGAINST BOOKING END DATE
=============================== */
            const sBookingEnd = oHostelModel.getProperty("/EndDate");

            if (sBookingEnd && oEnd) {
                const oBookingEnd = this._parseDate(sBookingEnd);

                if (oBookingEnd && oEnd > oBookingEnd) {
                    MessageBox.error(
                        this.i18nModel.getText("facilityEndDateCannotExceedBookingEndDate")
                    );

                    // -------------------------------
                    // ROLLBACK SELECTED MONTHS
                    // -------------------------------
                    oEditModel.setProperty(
                        "/SelectedMonths",
                        this._iPrevSelectedMonths || 1
                    );

                    // -------------------------------
                    // ROLLBACK END DATE
                    // -------------------------------
                    oEditModel.setProperty(
                        "/EndDate",
                        this._sPrevEditEndDate
                    );

                    // Reset DatePicker UI
                    const oDatePicker = this.byId("endDatePicker"); // ensure correct ID
                    if (oDatePicker && this._sPrevEditEndDate) {
                        oDatePicker.setDateValue(
                            this._parseDate(this._sPrevEditEndDate)
                        );
                    }

                    return;
                }
            }


            oEditModel.setProperty("/EndDate", this._formatDateToDDMMYYYY(oEnd));
            oEditModel.setProperty("/TotalDays", iTotalDays);
        },

        onEditDateChange: function (oEvent) {

            utils._LCvalidateMandatoryField(oEvent);

            const oView = this.getView();
            const oModel = oView.getModel("edit");

            const sUnit = oModel.getProperty("/UnitText");
            const sStart = oModel.getProperty("/StartDate");
            const sEnd = oModel.getProperty("/EndDate");

            if (!sStart) return;

            const oStart = this._parseDate(sStart);
            if (!oStart) return;

            let oEnd = null;
            let iDays = 1;
            let bAutoEndDate = false;

            /* ===============================
               PER MONTH
            =============================== */
            if (sUnit === "Per Month" || sUnit === "monthly") {

                const iMonths = parseInt(oModel.getProperty("/TotalMonths") || 1, 10);

                oEnd = new Date(oStart);
                oEnd.setMonth(oEnd.getMonth() + iMonths);
                oEnd.setDate(oEnd.getDate() - 1);

                iDays = Math.floor((oEnd - oStart) / 86400000);
                bAutoEndDate = true;
            }

            /* ===============================
               PER YEAR
            =============================== */
            else if (sUnit === "Per Year" || sUnit === "yearly") {

                const iYears = parseInt(oModel.getProperty("/TotalYears") || 1, 10);

                oEnd = new Date(oStart);
                oEnd.setFullYear(oEnd.getFullYear() + iYears);
                oEnd.setDate(oEnd.getDate() - 1);

                iDays = Math.floor((oEnd - oStart) / 86400000);
                bAutoEndDate = true;
            }

            /* ===============================
               PER DAY  ✅ FIXED
            =============================== */
            else if (sUnit === "Per Day" || sUnit === "daily") {

                oEnd = sEnd ? this._parseDate(sEnd) : new Date(oStart);

                // Ensure end date is at least the next day after start date
                const oNextDay = new Date(oStart);
                oNextDay.setDate(oNextDay.getDate() + 1);

                if (oEnd < oNextDay) {
                    oEnd = oNextDay;
                }

                const diffMs = oEnd - oStart;
                iDays = Math.floor(diffMs / 86400000);

                if (iDays < 1) iDays = 1;
            }

            /* ===============================
               PER HOUR ❌ DO NOTHING HERE
            =============================== */
            else if (sUnit === "Per Hour") {

                oEnd = sEnd ? this._parseDate(sEnd) : new Date(oStart);

                // Ensure end date is at least the next day after start date
                const oNextDay = new Date(oStart);
                oNextDay.setDate(oNextDay.getDate() + 1);

                if (oEnd < oNextDay) {
                    oEnd = oNextDay;
                }

                const diffMs = oEnd - oStart;
                iDays = Math.floor(diffMs / 86400000);

                if (iDays < 1) iDays = 1;
            }
            /* ===============================
   VALIDATE AGAINST BOOKING END DATE
=============================== */
            const oHostelModel = this.getView().getModel("HostelModel");
            const sBookingEnd = oHostelModel.getProperty("/EndDate");

            if (sBookingEnd && oEnd) {
                const oBookingEnd = this._parseDate(sBookingEnd);

                if (oBookingEnd && oEnd > oBookingEnd) {
                    MessageBox.error(
                        this.i18nModel.getText("facilityEndDateCannotExceedBookingEndDate")
                    );
                    //  ROLLBACK START DATE
                    oModel.setProperty("/StartDate", this._sPrevEditStartDate);

                    //  Reset DatePicker UI
                    oEvent.getSource().setDateValue(
                        this._parseDate(this._sPrevEditStartDate)
                    );
                    return;
                }
            }

            /* ===============================
               UPDATE MODEL
            =============================== */
            oModel.setProperty("/TotalDays", iDays);
            oModel.setProperty("/EndDate", this._formatDateToDDMMYYYY(oEnd));

            /* ===============================
               RESET VALUE STATE
            =============================== */
            if (bAutoEndDate) {
                const oEndDP = sap.ui.getCore().byId(
                    oView.getId() + "--FT_id_editEndDate"
                );
                if (oEndDP) {
                    oEndDP.setValueState("None");
                    oEndDP.setValueStateText("");
                }
            }

            utils._LCvalidateDate(oEvent);
        },

        // Utility function to format date
        _formatDateToDDMMYYYY: function (oDate) {
            const dd = String(oDate.getDate()).padStart(2, '0');
            const mm = String(oDate.getMonth() + 1).padStart(2, '0'); // Months start at 0
            const yyyy = oDate.getFullYear();
            return dd + "/" + mm + "/" + yyyy;
        },

        onEditFacilitySave: function (oEvent) {

            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oEditModel = oView.getModel("edit");

            if (!oHostelModel || !oEditModel) {
                MessageToast.show(this.i18nModel.getText("missingModels"));
                return;
            }

            const sViewId = oView.getId();
            const sUnitText = oEditModel.getProperty("/UnitText");
            const iTotalDays = Number(oEditModel.getProperty("/TotalDays") || 0);

            /* =========================
               VALIDATIONS
            ========================= */
            const oStartDate = sap.ui.core.Fragment.byId(sViewId, "FT_id_editStartDate");
            const oEndDate = sap.ui.core.Fragment.byId(sViewId, "FT_id_editEndDate");

            if (
                !utils._LCvalidateDate(oStartDate, "ID") ||
                !utils._LCvalidateDate(oEndDate, "ID")
            ) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectStartDateEndDate"));
                return;
            }

            if (sUnitText === "Per Day" && iTotalDays < 1) {
                MessageBox.error(this.i18nModel.getText("totalDaysmustbeatLeastforPerDayBooking"));
                return;
            }

            if (sUnitText === "Per Hour") {
                const oStartTime = sap.ui.core.Fragment.byId(sViewId, "FT_id_editStartTime");
                const oEndTime = sap.ui.core.Fragment.byId(sViewId, "FT_id_editEndTime");

                if (
                    !utils._LCvalidateMandatoryField(oStartTime, "ID") ||
                    !utils._LCvalidateMandatoryField(oEndTime, "ID")
                ) {
                    MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                    return;
                }

                const start = new Date("1970-01-01T" + oStartTime.getValue() + ":00");
                const end = new Date("1970-01-01T" + oEndTime.getValue() + ":00");

                if (start >= end) {
                    MessageToast.show(this.i18nModel.getText("startTimeShouldbeLessthanEndTime"));
                    return;
                }
            }
            if (sUnitText === "Per Month") {

                const iFacilityMonths =
                    Number(oEditModel.getProperty("/SelectedMonths")) || 0;

                const iBookingMonths =
                    Number(oHostelModel.getProperty("/SelectedMonths")) || 0;


                if (iFacilityMonths > iBookingMonths) {
                    MessageBox.error(
                        this.i18nModel.getText("facilityMonthsCannotExceedBookingMonths")
                    );
                    return;
                }
            }

            if (sUnitText === "Per Year") {

                const iFacilityYears =
                    Number(oEditModel.getProperty("/SelectedMonths")) || 0;

                const iBookingYears =
                    Number(oHostelModel.getProperty("/SelectedMonths")) || 0;

                if (iFacilityYears > iBookingYears) {
                    MessageBox.error(
                        this.i18nModel.getText("facilityYearsCannotExceedBookingYears")
                    );
                    return;
                }
            }

            /* =========================
               LOCATE PERSON & FACILITY
            ========================= */
            const aPersons = oHostelModel.getProperty("/Persons") || [];
            const sPath = this._sSelectedPath; // "/Persons/0/AllSelectedFacilities/2"

            const iPersonIndex = parseInt(sPath.split("/")[2], 10);
            const iFacilityIndex = parseInt(sPath.split("/")[4], 10);

            if (
                isNaN(iPersonIndex) ||
                isNaN(iFacilityIndex) ||
                !aPersons[iPersonIndex] ||
                !aPersons[iPersonIndex].AllSelectedFacilities[iFacilityIndex]
            ) {
                MessageToast.show(this.i18nModel.getText("couldnotfindSelectedFacilityGloballistPleasereselectRowtryagain"));
                return;
            }

            /* =========================
               UPDATE FACILITY DATA
            ========================= */
            const oUpdatedData = Object.assign({}, oEditModel.getData());
            const oPerson = aPersons[iPersonIndex];
            const oFacility = oPerson.AllSelectedFacilities[iFacilityIndex];

            Object.assign(oFacility, oUpdatedData);

            /* =========================
               DATE UNITS (ONCE)
            ========================= */
            const parseDate = v => {
                if (typeof v === "string" && v.includes("/")) {
                    const [d, m, y] = v.split("/");
                    return new Date(+y, +m - 1, +d);
                }
                return new Date(v);
            };

            // const oStart = parseDate(oHostelModel.getProperty("/StartDate"));
            // const oEnd = parseDate(oHostelModel.getProperty("/EndDate"));

            //  USE FACILITY-LEVEL DAYS (ALREADY CORRECT)
            const iDays = Number(oEditModel.getProperty("/TotalDays") || 1);
            //  TAKE FROM EDIT MODEL IF PRESENT
            let iMonths = 0;
            let iYears = 0;

            if (sUnitText === "Per Month") {
                iMonths =
                    Number(oEditModel.getProperty("/SelectedMonths")) ||
                    Number(oEditModel.getProperty("/TotalMonths")) || 1;

                oFacility.TotalMonths = iMonths;
                oFacility.TotalYears = 0;
            }

            if (sUnitText === "Per Year") {
                iYears =
                    Number(oEditModel.getProperty("/SelectedMonths")) ||
                    Number(oEditModel.getProperty("/TotalYears")) || 1;

                oFacility.TotalYears = iYears;
                oFacility.TotalMonths = 0;
            }


            /* =========================
               RECALCULATE ONLY FACILITY
            ========================= */
            oFacility.TotalMonths = iMonths;

            oFacility.TotalAmount = this._calculateFacilityTotal(
                oFacility,
                oFacility.TotalDays ?? iDays,
                oFacility.TotalMonths,
                oFacility.TotalYears ?? iYears
            );


            /* =========================
               RECALCULATE ONLY PERSON
            ========================= */
            oPerson.TotalFacilityPrice = oPerson.AllSelectedFacilities.reduce(
                (sum, f) => sum + (Number(f.TotalAmount) || 0),
                0
            );

            const baseRoomRent = Number(oHostelModel.getProperty("/FinalPrice")) || 0;
            const paymentType = oHostelModel.getProperty("/SelectedPriceType");
            const selectedMonths = Number(oHostelModel.getProperty("/SelectedMonths")) || 1;

            const bookingDays =
                Number(oHostelModel.getProperty("/TotalDays")) ||
                Number(oHostelModel.getProperty("/NoOfDays")) ||
                iDays;
            const bookingMonths =
                Number(oHostelModel.getProperty("/SelectedMonths")) || 1;
            const bookingYears =
                Math.max(1, Math.ceil(bookingMonths / 12));

            // let roomRent = 0;
            // switch (paymentType) {
            //     case "Per Day":
            //         roomRent = baseRoomRent * bookingDays;
            //         break;
            //     case "Per Month":
            //         roomRent = baseRoomRent * bookingMonths;
            //         break;
            //     case "Per Year":
            //         roomRent = baseRoomRent * bookingYears;
            //         break;
            // }
            const roomRentSafe = Number(oPerson.RoomRentPerPerson) || 0;
            const facilityTotalSafe = Number(oPerson.TotalFacilityPrice) || 0;

            // ✅ Correct subtotal
            oPerson.SubTotal = roomRentSafe + facilityTotalSafe;



            // ------------------
            // GST (REFERENCE LOGIC ONLY)
            // ------------------
            const sGSTType = oHostelModel.getProperty("/GSTType");
            const sGSTValue = oHostelModel.getProperty("/GSTValue");

            let cgst = 0;
            let sgst = 0;
            let igst = 0;

            const gstPercent = Number(sGSTValue) || 0;

            if (sGSTType === "CGST/SGST") {

                const halfGST = gstPercent;

                cgst = oPerson.SubTotal * halfGST / 100;
                sgst = oPerson.SubTotal * halfGST / 100;

            } else if (sGSTType === "IGST") {

                igst = oPerson.SubTotal * gstPercent / 100;
            }

            oPerson.CGST = Number(cgst.toFixed(2));
            oPerson.SGST = Number(sgst.toFixed(2));
            oPerson.IGST = Number(igst.toFixed(2));

            oPerson.FinalTotalCost = Number((
                oPerson.SubTotal +
                oPerson.CGST +
                oPerson.SGST +
                oPerson.IGST
            ).toFixed(2));
            let divisor = 1;

            if (paymentType === "Per Month") {
                divisor = Number(oHostelModel.getProperty("/SelectedMonths")) || 1;
            }

            if (paymentType === "Per Year") {
                divisor = Number(oHostelModel.getProperty("/SelectedMonths")) || 1;
            }

            const monthly = oPerson.FinalTotalCost / divisor;

            oPerson.MonthlyCostPerPerson = Number(monthly.toFixed(2));
            oPerson.MonthlyCostPerson = Number(monthly.toFixed(2));



            // if (paymentType === "Per Day") {
            //     oPerson.MonthlyCostPerPerson =
            //         Number(oPerson.FinalTotalCost.toFixed(2));
            //     oPerson.MonthlyCostPerson =
            //         Number(oPerson.FinalTotalCost.toFixed(2));
            // } else {
            //     const monthly =
            //         oPerson.FinalTotalCost / selectedMonths;

            //     oPerson.MonthlyCostPerPerson =
            //         Number(monthly.toFixed(2));

            //     oPerson.MonthlyCostPerson =
            //         Number(monthly.toFixed(2));
            // }


            oPerson.TotalDays = iDays;
            let grandTotal = 0;

            if (paymentType === "Per Day") {

                grandTotal = aPersons.reduce(
                    (sum, p) => sum + (Number(p.FinalTotalCost) || 0),
                    0
                );

                oHostelModel.setProperty("/GrandTotal", grandTotal.toFixed(2));

            } else {

                const grandTotal = aPersons.reduce(
                    (sum, p) => sum + (Number(p.FinalTotalCost) || 0),
                    0
                );

                aPersons.forEach(p => p.GrandTotal = grandTotal);

                oHostelModel.setProperty("/GrandTotal", grandTotal.toFixed(2));
            }

            aPersons.forEach(p => p.GrandTotal = grandTotal);
            oHostelModel.setProperty("/Persons", aPersons);

            oHostelModel.setProperty("/IsInitialCalculationDone", true);
            oHostelModel.setProperty("/IsFacilitySelectionDirty", true);
            oHostelModel.refresh(true);

            /* =========================
               CLEANUP
            ========================= */
            this.onEditDialogClose();

            const oTable = oView.byId("idFacilitySummaryTable");
            if (oTable) {
                try { oTable.removeSelections(true); } catch (e) { }
                const oBinding = oTable.getBinding("items");
                if (oBinding) oBinding.refresh();
            }

            this._oSelectedTable = null;
            this._oSelectedFacility = null;
            this._oSelectedIndex = null;
            this._sSelectedPath = null;
            oHostelModel.setProperty("/CouponCode", "");
            oHostelModel.refresh(true);
            const inputID = sap.ui.core.Fragment.byId(
                this.getView().getId(),
                "BookingcouponInput"
            );
            if (inputID) {
                inputID.setShowValueHelp(false);
            }


            MessageToast.show(this.i18nModel.getText("facilityUpdatedSuccessfully"));
        },

        _formatDateToDDMMYYYY: function (dt) {
            if (!dt || !(dt instanceof Date)) return "";
            const dd = String(dt.getDate()).padStart(2, "0");
            const mm = String(dt.getMonth() + 1).padStart(2, "0");
            const yyyy = dt.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        },

        _calculateFacilityTotal: function (f, iDays, iMonths, iYears) {

            const price = Number(f.Price || f.SelectedPrice || 0);
            const unit = f.UnitText || f.SelectedPriceType;

            switch (unit) {

                case "Per Hour":
                    return price *
                        Number(f.TotalTime ?? 1) *
                        Number(f.TotalDays ?? 1);

                case "Per Day":
                    return price * iDays;

                case "Per Month":
                    return price * iMonths;

                case "Per Year":
                    return price * iYears;

                default:
                    return 0;
            }
        },

        _parseDate: function (s) {
            if (!s) return null;

            // dd/MM/yyyy
            if (typeof s === "string" && s.includes("/")) {
                const [d, m, y] = s.split("/").map(Number);
                return new Date(y, m - 1, d, 0, 0, 0, 0); // 🔑 normalize time
            }

            // Date object or ISO
            const dt = new Date(s);
            if (isNaN(dt)) return null;

            return new Date(
                dt.getFullYear(),
                dt.getMonth(),
                dt.getDate(),
                0, 0, 0, 0 // 🔑 normalize time
            );
        },

        onOpenDocumentPreview: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("HostelModel");
            const oDoc = oCtx && oCtx.getObject();

            if (!oDoc || !oDoc.Document) {
                MessageToast.show(this.i18nModel.getText("noDocumentPreview") || "No document available");
                return;
            }

            // PDF handling
            if (oDoc.FileType && oDoc.FileType.includes("pdf")) {
                this.openPDFPreview(oDoc);
                return;
            }

            // Image handling
            this.openImagePreview(oDoc);
        },

        /** ========================================
         *  SEPARATE PDF OPENER FUNCTION
         * ======================================= */
        openPDFPreview: function (oDoc) {
            const sTitle = oDoc.FileName || "PDF Preview";

            // Create clean data URL
            let sBase64 = oDoc.Document;
            if (sBase64.startsWith("data:")) {
                sBase64 = sBase64.split(',')[1];
            }
            const sDataUrl = `data:application/pdf;base64,${sBase64}`;

            if (this._oPDFDialog) {
                this._oPDFDialog.destroy();
                this._oPDFDialog = null;
            }

            // PURE IFRAME with browser's native PDF viewer
            const oIframe = new HTML({
                content: `
                    <iframe id="pdfIframe" 
                            src="${sDataUrl}" 
                            style="width:100%; height:85vh; border:none; background:white;" 
                            frameborder="0"
                            scrolling="auto">
                    </iframe>`,
                sanitizeContent: false,
                preferDOM: true
            });

            this._oPDFDialog = new Dialog({
                title: sTitle,
                contentWidth: "90%",
                contentHeight: "90vh",
                draggable: true,
                resizable: true,
                contentPadding: false,
                content: [oIframe],
                beginButton: new Button({
                    text: "Close",
                    press: () => this._oPDFDialog.close()
                }),
                endButton: new Button({
                    text: "Download",
                    press: () => {
                        const link = document.createElement('a');
                        link.href = sDataUrl;
                        link.download = sTitle;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }),
                afterClose: () => {
                    this._oPDFDialog.destroy();
                    this._oPDFDialog = null;
                }
            });

            this.getView().addDependent(this._oPDFDialog);
            this._oPDFDialog.open();
        },

        /** ========================================
         *  IMAGE PREVIEW (your original logic)
         * ======================================= */
        openImagePreview: function (oDoc) {
            let sData = oDoc.Document;
            if (!sData.startsWith("data:")) {
                const sType = oDoc.FileType || "image/png";
                sData = `data:${sType};base64,${sData}`;
            }

            const sTitle = oDoc.FileName || "Image Preview";

            if (this._oImageDialog) {
                this._oImageDialog.destroy();
                this._oImageDialog = null;
            }

            // FIXED IMAGE - Perfect fit, no scroll
            const oImage = new Image({
                id: this.createId("previewImage"),
                src: sData,
                densityAware: false,
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                maxHeight: "70vh",
                style: "max-width: 100%; max-height: 70vh; object-fit: cover; display: block; margin: 0 auto;"
            });

            // SIMPLIFIED CONTAINER - No FlexBox needed
            const oVBox = new sap.m.VBox({
                width: "100%",
                height: "75vh",
                alignItems: "Center",
                justifyContent: "Center",
                fitContainer: true,
                items: [oImage]
            });

            this._oImageDialog = new Dialog({
                title: sTitle,
                contentWidth: "80%",
                contentHeight: "80vh",
                draggable: true,
                resizable: true,
                contentPadding: false,
                content: [oVBox],
                beginButton: new Button({
                    text: "Close",
                    press: function () {
                        this._oImageDialog.close();
                    }.bind(this)
                }),
                afterClose: function () {
                    this._oImageDialog.destroy();
                    this._oImageDialog = null;
                }.bind(this)
            });

            this.getView().addDependent(this._oImageDialog);
            this._oImageDialog.open();
        }
        ,

        /** ========================================
         *  CLEANUP ON EXIT
         * ======================================= */
        onExit: function () {
            // Cleanup PDFViewer blob URL
            const oPDFViewer = sap.ui.getCore().byId("pdfViewerGlobal");
            if (oPDFViewer && oPDFViewer._blobUrl) {
                URL.revokeObjectURL(oPDFViewer._blobUrl);
            }

            // Destroy image dialog
            if (this._oImageDialog) {
                this._oImageDialog.destroy();
                this._oImageDialog = null;
            }
        },

        // Close preview
        onClosePreview: function () {
            if (this._oDocPreviewDialog) {
                this._oDocPreviewDialog.close();
            }
        },

        _sumGrandTotalOfPersons: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const aPersons = oHostelModel.getProperty("/Persons") || [];

            let sum = 0;

            aPersons.forEach(person => {
                sum += Number(person.GrandTotal || 0);
            });

            return sum;
        },

        oncancelCoupon: function () {

            const oHostelModel = this.getView().getModel("HostelModel");

            // -----------------------------
            // RESET COUPON FIELDS
            // -----------------------------
            oHostelModel.setProperty("/CouponCode", "");
            oHostelModel.setProperty("/AppliedDiscount", 0);
            oHostelModel.setProperty("/AppliedDiscountType", "");
            oHostelModel.setProperty("/AppliedDiscountValue", 0);
            oHostelModel.setProperty("/AppliedUptoValue", 0);

            const aPersons = oHostelModel.getProperty("/Persons") || [];
            if (!aPersons.length) return;

            const paymentType =
                oHostelModel.getProperty("/SelectedPriceType");

            const oFirstPerson = aPersons[0];

            // -----------------------------
            // RESTORE LATEST SAVED VALUES
            // -----------------------------


            const sStartDate = oHostelModel.getProperty("/StartDate");
            const sEndDate = oHostelModel.getProperty("/EndDate");
            const baseRoomRent =
                Number(oHostelModel.getProperty("/FinalPrice")) || 0;

            const selectedMonths =
                Number(oHostelModel.getProperty("/SelectedMonths")) || 1;

            // 🔁 Recalculate using CURRENT DATES
            const result = this.calculateTotals(
                aPersons,
                sStartDate,
                sEndDate,
                baseRoomRent,
                selectedMonths
            );

            if (!result) return;

            oHostelModel.setProperty("/Persons", result.Persons);
            oHostelModel.setProperty("/GrandTotal", result.GrandTotal);
            oHostelModel.refresh(true);



            oFirstPerson.AppliedDiscount = 0;
            oFirstPerson.SubTotalAfterDiscount = 0;

            // -----------------------------
            // RECALCULATE GRAND TOTAL
            // -----------------------------
            const grandTotal = aPersons.reduce(
                (sum, p) => sum + (Number(p.FinalTotalCost) || 0),
                0
            );

            aPersons.forEach(p => p.GrandTotal = grandTotal);

            oHostelModel.setProperty("/Persons", aPersons);
            oHostelModel.setProperty("/GrandTotal", grandTotal.toFixed(2));

            oHostelModel.refresh(true);
            const inputID = sap.ui.core.Fragment.byId(
                this.getView().getId(),
                "BookingcouponInput"
            );
            if (inputID) {
                inputID.setShowValueHelp(false);
            }
           
        }
        ,
        /* =========================================================== */
        /*  CENTRAL PRICING ENGINE                                    */
        /* =========================================================== */

        calculateTotals: function (
            aPersons,
            sStartDate,
            sEndDate,
            roomRentPrice,
            selectedMonths
        ) {

            const oHostelModel = this.getView().getModel("HostelModel");

            const sGSTType = oHostelModel.getProperty("/GSTType");
            const sGSTValue = oHostelModel.getProperty("/GSTValue");

            /* -----------------------------
               DATE UNITS
            ----------------------------- */
            const oUnits = this._calculateDateUnits(sStartDate, sEndDate);

            const iDays = oUnits.iDays;
            const iMonthsFromDates = oUnits.iMonths;
            const iYears = oUnits.iYears;

            selectedMonths =
                Number(selectedMonths) || iMonthsFromDates || 1;

            let grandTotal = 0;
            let bAnyIndia = false;

            /* -----------------------------
               LOOP PERSONS
            ----------------------------- */
            aPersons.forEach(oPerson => {

                const paymentType =
                    oHostelModel.getProperty("/SelectedPriceType");

                /* -----------------------------
                   ROOM RENT
                ----------------------------- */
                let roomRent = 0;

                switch (paymentType) {

                    case "Per Day":
                        roomRent = Number(roomRentPrice) * iDays;
                        break;

                    case "Per Month":
                        roomRent = Number(roomRentPrice) * selectedMonths;
                        break;

                    case "Per Year":
                        roomRent = Number(roomRentPrice) * selectedMonths;
                        break;

                    default:
                        roomRent = Number(roomRentPrice);
                }

                oPerson.RoomRentPerPerson = Number(roomRent.toFixed(2));

                /* -----------------------------
                   FACILITIES
                ----------------------------- */
                let facilityTotal = 0;
                oPerson.AllSelectedFacilities = [];

                (oPerson.Facilities?.SelectedFacilities || []).forEach(f => {

                    const price = Number(f.SelectedPrice) || 0;
                    let total = 0;

                    switch (f.SelectedPriceType) {

                        case "Per Hour":
                            total = price * 1 * iDays;
                            break;

                        case "Per Day":
                            total = price * iDays;
                            break;

                        case "Per Month":
                            total = price * selectedMonths;
                            break;

                        case "Per Year":
                            total = price * iYears;
                            break;
                    }

                    facilityTotal += total;

                    oPerson.AllSelectedFacilities.push({
                        FacilityName: f.FacilityName,
                        Price: price,
                        Currency: f.Currency,
                        UnitText: f.SelectedPriceType,
                        StartDate: sStartDate,
                        EndDate: sEndDate,
                        TotalDays: iDays,
                        TotalAmount: Number(total.toFixed(2)),
                        Image: f.Image,
                        Branch: f.BranchCode
                    });
                });

                oPerson.TotalFacilityPrice =
                    Number(facilityTotal.toFixed(2));

                /* -----------------------------
                   SUBTOTAL
                ----------------------------- */
                oPerson.SubTotal =
                    Number((
                        oPerson.RoomRentPerPerson +
                        oPerson.TotalFacilityPrice
                    ).toFixed(2));

                /* -----------------------------
                   GST
                ----------------------------- */
                let cgst = 0, sgst = 0, igst = 0;

                if (sGSTType === "CGST/SGST") {

                    const p = Number(sGSTValue) || 0;

                    cgst = oPerson.SubTotal * p / 100;
                    sgst = oPerson.SubTotal * p / 100;

                    bAnyIndia = true;

                } else if (sGSTType === "IGST") {

                    const p = Number(sGSTValue) || 0;

                    igst = oPerson.SubTotal * p / 100;

                    bAnyIndia = true;
                }

                oPerson.CGST = Number(cgst.toFixed(2));
                oPerson.SGST = Number(sgst.toFixed(2));
                oPerson.IGST = Number(igst.toFixed(2));

                /* -----------------------------
                   FINAL TOTAL
                ----------------------------- */
                oPerson.FinalTotalCost =
                    Number((
                        oPerson.SubTotal +
                        oPerson.CGST +
                        oPerson.SGST +
                        oPerson.IGST
                    ).toFixed(2));

                /* -----------------------------
                   MONTHLY COST DISPLAY
                ----------------------------- */
                oPerson.MonthlyCostPerPerson =
                    Number((oPerson.FinalTotalCost / selectedMonths).toFixed(2));

                grandTotal += oPerson.FinalTotalCost;
            });

            aPersons.forEach(p => p.GrandTotal =
                Number(grandTotal.toFixed(2)));

            oHostelModel.setProperty("/IsIndia", !!bAnyIndia);

            return {
                Persons: aPersons,
                GrandTotal: Number(grandTotal.toFixed(2))
            };
        },

        /*  DATE UNIT HELPER                                          */

        _calculateDateUnits: function (sStartDate, sEndDate) {

            const parseDate = (s) => {

                if (!s) return null;

                if (typeof s === "string" && s.includes("/")) {
                    const [d, m, y] = s.split("/").map(Number);
                    return new Date(y, m - 1, d, 0, 0, 0, 0);
                }

                const dt = new Date(s);
                if (isNaN(dt)) return null;

                return new Date(
                    dt.getFullYear(),
                    dt.getMonth(),
                    dt.getDate(),
                    0, 0, 0, 0
                );
            };

            const oStart = parseDate(sStartDate);
            const oEnd = parseDate(sEndDate);

            if (!oStart || !oEnd || oEnd < oStart) {
                return { iDays: 1, iMonths: 1, iYears: 1 };
            }

            /* DAYS (INCLUSIVE) */
            let iDays =
                Math.floor((oEnd - oStart) / 86400000);

            if (iDays < 1) iDays = 1;

            /* MONTHS (CALENDAR) */
            let iMonths =
                (oEnd.getFullYear() - oStart.getFullYear()) * 12 +
                (oEnd.getMonth() - oStart.getMonth());

            if (iMonths < 1) iMonths = 1;

            /* YEARS */
            let iYears =
                oEnd.getFullYear() - oStart.getFullYear();

            if (iYears < 1) iYears = 1;

            return {
                iDays: iDays,
                iMonths: iMonths,
                iYears: iYears
            };
        }        ,

        onCouponLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            // var oBtn = this.byId("couponApplyBtn");

            // Show icon only if there is value
            oInput.setShowValueHelp(!!sValue);

            if (sValue && sValue.trim().length > 0) {
                // oBtn.setVisible(true);
            } else {
                // oBtn.setVisible(true); // Always show when blank
            }
        },

        onChangeCouponCode: async function (oEvent) {

            const oHostelModel = this.getView().getModel("HostelModel");
            oHostelModel.setProperty("/CouponButtonVisible", true);

            const sEnteredCode = oHostelModel.getProperty("/CouponCode")?.trim();
            const sBranchCode = oHostelModel.getProperty("/BranchCode");
            const paymentType = oHostelModel.getProperty("/SelectedPriceType");
            if (!sEnteredCode) {
                MessageToast.show(this.i18nModel.getText("pleaseEnterCoupon"));
                return;
            }

            try {
                this.getBusyDialog();

                const filter = {
                    CouponCode: sEnteredCode,
                    Status: "Active"
                };

                /* =============================
                   FETCH COUPON
                ============================== */
                const response = await this.ajaxReadWithJQuery("HM_CouponBookingCount", filter);
                const aCoupons = response?.data || [];

                if (!aCoupons.length) {
                    MessageToast.show(this.i18nModel.getText("noCouponsFound"));
                    return;
                }
                const oCoupon = aCoupons[0];

                // Convert to numbers (important)
                const maxUses = Number(oCoupon.MaxUses);
                const usedCount = Number(oCoupon.couponUsedCount);

                if (usedCount >= maxUses) {
                    sap.m.MessageToast.show("This coupon has already been used");
                    return;
                }

                const oMatched = aCoupons.find(c =>
                    String(c.CouponCode).toUpperCase() === sEnteredCode.toUpperCase()
                );

                if (!oMatched) {
                    MessageToast.show(this.i18nModel.getText("invalidCouponCode"));
                    return;
                }

                /* =============================
                   EXPIRY CHECK
                ============================== */
                const couponEndISO = new Date(oMatched.EndDate).toISOString().split("T")[0];
                const couponStartISO = new Date(oMatched.StartDate).toISOString().split("T")[0];
                const todayISO = new Date().toISOString().split("T")[0];

                if (couponEndISO < todayISO) {
                    MessageToast.show(this.i18nModel.getText("couponisExpired"));
                    return;
                }
                if (couponStartISO > todayISO) {
                    MessageToast.show(this.i18nModel.getText("couponNotYetValid"));
                    return;
                }

                /* =============================
                   BRANCH VALIDATION
                ============================== */
                const couponBranch = String(oMatched.BranchCode || "").trim();
                const selectedBranch = String(sBranchCode || "").trim();

                if (couponBranch && couponBranch !== selectedBranch) {
                    MessageToast.show(
                        this.i18nModel.getText("thisCouponValidtheSelectedBranchRoom")
                    );
                    oHostelModel.setProperty("/CouponCode", "");
                    const inputID = sap.ui.core.Fragment.byId(
                        this.getView().getId(),
                        "BookingcouponInput"
                    );
                    if (inputID) {
                        inputID.setShowValueHelp(false);
                    } 3
                    return;
                }

                /* =============================
                   COUPON DETAILS
                ============================== */
                const discountValue = Number(oMatched.DiscountValue || 0);
                const discountType = (oMatched.DiscountType || "").toLowerCase();
                const minOrderValue = Number(oMatched.MinOrderValue || 0);
                const uptoValue = Number(oMatched.UptoValue || 0);

                oHostelModel.setProperty("/AppliedDiscountType", discountType);
                oHostelModel.setProperty("/AppliedDiscountValue", discountValue);
                oHostelModel.setProperty("/MinOrderValue", minOrderValue);
                oHostelModel.setProperty("/AppliedUptoValue", uptoValue);

                /* =============================
                   PERSON VALIDATION
                ============================== */
                const aPersons = oHostelModel.getProperty("/Persons") || [];

                if (!aPersons.length) {
                    MessageToast.show("No persons available to apply coupon.");
                    return;
                }

                const oFirstPerson = aPersons[0];

                // STORE LATEST VALUES BEFORE COUPON
                // ================================
                if (!oFirstPerson.__preCouponState) {

                    oFirstPerson.__preCouponState = {
                        FinalTotalCost: Number(oFirstPerson.FinalTotalCost || 0),
                        MonthlyCostPerPerson: Number(oFirstPerson.MonthlyCostPerPerson || 0),
                        CGST: Number(oFirstPerson.CGST || 0),
                        SGST: Number(oFirstPerson.SGST || 0),
                        IGST: Number(oFirstPerson.IGST || 0),
                        SubTotal: Number(oFirstPerson.SubTotal || 0)
                    };
                }


                //  Base amount = FIRST PERSON FinalTotalCost
                const personBaseAmount =
                    paymentType === "Per Day"
                        ? Number(oFirstPerson.FinalTotalCost || 0)
                        : Number(oFirstPerson.MonthlyCostPerPerson || 0);

                if (personBaseAmount <= 0) {
                    MessageToast.show(this.i18nModel.getText("subtotalisZeroCannotApplyCoupon"));
                    return;
                }

                if (personBaseAmount < minOrderValue) {
                    MessageToast.show(
                        `Minimum Order Value ₹${minOrderValue} required to apply this coupon.`
                    );
                    return;
                }

                /* =============================
                   APPLY DISCOUNT (FIRST PERSON ONLY)
                ============================== */
                let discountAmount = 0;
                let discountedAmount = personBaseAmount;

                if (discountType === "percentage") {
                    discountAmount = personBaseAmount * (discountValue / 100);

                    if (uptoValue > 0 && discountAmount > uptoValue) {
                        discountAmount = uptoValue;
                    }

                    discountedAmount = personBaseAmount - discountAmount;
                } else {
                    discountAmount = discountValue;
                    discountedAmount = personBaseAmount - discountAmount;
                }

                discountedAmount = Math.max(0, discountedAmount);

                /* =============================
                   RE-CALCULATE GST (FIRST PERSON)
                ============================== */
                let finalTotal = discountedAmount;

                /* =============================
                   UPDATE FIRST PERSON
                ============================== */
                oFirstPerson.AppliedDiscount = discountAmount;
                oFirstPerson.SubTotalAfterDiscount = discountedAmount;
                if (paymentType !== "Per Day") {

                    // reduce from monthly
                    oFirstPerson.MonthlyCostPerPerson =
                        Number(discountedAmount.toFixed(2));

                    // also reduce from final
                    oFirstPerson.FinalTotalCost =
                        Number((oFirstPerson.FinalTotalCost - discountAmount).toFixed(2));

                } else {
                    oFirstPerson.MonthlyCostPerPerson =
                        Number(discountedAmount.toFixed(2));

                    // only reduce final total
                    oFirstPerson.FinalTotalCost =
                        Number(discountedAmount.toFixed(2));
                }

                if (paymentType === "Per Day") {
                    oFirstPerson.FinalTotalCost = finalTotal;
                } else {
                    oFirstPerson.MonthlyCostPerPerson = finalTotal;
                }


                /* =============================
                   RE-CALCULATE GRAND TOTAL
                ============================== */
                let grandTotal = 0;
                if (paymentType === "Per Day") {
                    grandTotal = aPersons.reduce(
                        (sum, p) => sum + (Number(p.FinalTotalCost) || 0),
                        0
                    );

                    oHostelModel.setProperty("/GrandTotal", grandTotal);

                } else {
                    grandTotal = aPersons.reduce(
                        (sum, p) => sum + (Number(p.FinalTotalCost) || 0),
                        0
                    );

                    oHostelModel.setProperty("/MonthlyCostPerPerson", grandTotal.toFixed(2));
                }
                oHostelModel.setProperty("/GrandTotal", Number(grandTotal.toFixed(2)));
                // oHostelModel.setProperty("/FinalTotalCost", grandTotal);
                oHostelModel.setProperty("/Persons", aPersons);
                oHostelModel.setProperty("/CouponButtonVisible", false);

                oHostelModel.refresh(true);

                MessageToast.show(
                    this.i18nModel.getText("couponAppliedSuccessfully")
                );
                 oHostelModel.setProperty("/CouponCode", "");
                this._oAddDialog.close()

            } catch (err) {
                console.error(err);
                MessageToast.show(this.i18nModel.getText("errorApplyingCoupon"));
            } finally {
                this.closeBusyDialog();
            }
        },

       onclickaddBTN: function () {

    if (!this._oAddDialog) {
        this._oAddDialog = sap.ui.xmlfragment(
            this.getView().getId(),
            "sap.ui.com.project1.fragment.AddCoupon", // change to your fragment path
            this
        );
        this.getView().addDependent(this._oAddDialog);
    }

    this._oAddDialog.open();

},
onCloseApplyNow:function(){
      const oHostelModel = this.getView().getModel("HostelModel");
     oHostelModel.setProperty("/CouponCode", "");
        this._oAddDialog.close()
}
    });
});