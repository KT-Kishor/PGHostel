sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, Fragment, utils, MessageToast, MessageBox) {

    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Booking", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBooking").attachMatched(this._onRouteMatched, this);
            this._iFacilityStartIndex = 0;
            this._iFacilityPageSize = 3; // show 3 cards at once

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
            return this._isSinglePersonOnlyPropertyType(
                this.getView().getModel("HostelModel").getProperty("/PropertyType")
            );
        },

        _getPrimaryGuestName: function () {
            return this.getView().getModel("HostelModel").getProperty("/FullName") || "Primary Guest";
        },

        _getOccupantOptions: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const aOccupants = [{
                id: "SELF",
                name: oHostelModel.getProperty("/FullName") || "Primary Guest"
            }];

            if (oBookingView.getProperty("/showFamilySection")) {
                (oBookingView.getProperty("/FamilyMembers") || []).filter(function (oMember) {
                    return oMember.Selected;
                }).forEach(function (oMember) {
                    aOccupants.push({
                        id: oMember.id,
                        name: oMember.Name || oMember.Relation || "Family Member"
                    });
                });
            }

            return aOccupants;
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
                oModel.setProperty(sRowPath + "/selected", bSelected);

                if (!bSelected) {
                    oModel.setProperty(sRowPath + "/qty", 0);
                }
            }

            oModel.refresh(true);
        },

        onLaundryQtyChange: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("FacilitySelection");
            const sPath = oCtx.getPath();
            const oSelectionModel = this.getView().getModel("FacilitySelection");
            const bSelected = !!oSelectionModel.getProperty(sPath + "/selected");

            if (!bSelected) {
                oSelectionModel.setProperty(sPath + "/qty", 0);
                oSelectionModel.refresh(true);
                return;
            }

            const iValue = Math.max(parseInt(oEvent.getParameter("value"), 10) || 0, 0);
            oSelectionModel.setProperty(sPath + "/qty", iValue);
            oSelectionModel.refresh(true);
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
                    oFacility.SelectedPriceType + " - " +
                    this._toNumber(oFacility.SelectedPrice) + " " +
                    (oFacility.Currency || "")
                );
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

                        return {
                            FacilityID: oFacility.ID,
                            FacilityName: oFacility.FacilityName || oFacility.Type,
                            Type: oFacility.Type,
                            SelectionMode: oSelectedFacility.SelectionMode || oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility),
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
                            SelectionModeLabel: this._getFacilitySelectionModeLabel(oSelectedFacility.SelectionMode || oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility))
                        };
                    }.bind(this));

                this._syncSelectedFacilityPersonsWithOccupants();
                this._applyFacilityPriceFilter();
            } catch (oError) {
                this.getView().getModel("FacilityModel").setProperty("/Facilities", []);
                this._renderFacilityCards();
            }
        },
        _syncSelectedFacilityPersonsWithOccupants: function () {
            const aOccupants = this._getOccupantOptions();
            const aValidOccupants = aOccupants.map(function (oItem) {
                return oItem.id;
            });

            (this._aAllFacilities || []).forEach(function (oFacility) {
                const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);

                if (!Array.isArray(oFacility.SelectedPersonIds)) {
                    oFacility.SelectedPersonIds = [];
                }

                oFacility.SelectedPersonIds = oFacility.SelectedPersonIds.filter(function (sId) {
                    return aValidOccupants.includes(sId);
                });

                if (sSelectionMode === "PERSON" && oFacility.Selected && oFacility.SelectedPersonIds.length === 0) {
                    oFacility.SelectedPersonIds = ["SELF"];
                }

                if (sSelectionMode === "PERSON_QTY") {
                    oFacility.PersonQuantities = this._buildFacilityPersonLines(oFacility).filter(function (oLine) {
                        return aValidOccupants.includes(oLine.personId);
                    });
                }
            }.bind(this));
        },



        // Replace or update the part where CurrentPrice and CurrentPriceType are assigned
        _applyFacilityPriceFilter: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oFacilityModel = this.getView().getModel("FacilityModel");
            const sPlan = oModel.getProperty("/SelectedPriceType");

            if (!oFacilityModel) return;

            oFacilityModel.setProperty("/Facilities", (this._aAllFacilities || [])
                .filter(oFacility => this._buildFacilityPriceOptions(oFacility).length > 0)
                .map(oFacility => {
                    const aPriceOptions = this._buildFacilityPriceOptions(oFacility);
                    const oMatchedOption = aPriceOptions.find(function (oOption) {
                        return oOption.key === sPlan;
                    }) || aPriceOptions.find(function (oOption) {
                        return oOption.key === "Unit Price";
                    }) || aPriceOptions[0];
                    const fCurrentPrice = oMatchedOption ? this._toNumber(oMatchedOption.price) : 0;
                    const sCurrentPriceType = oMatchedOption ? oMatchedOption.key : sPlan;

                    oFacility.CurrentPrice = fCurrentPrice;
                    oFacility.CurrentPriceType = sCurrentPriceType;
                    oFacility.DisplayPrice = fCurrentPrice + " " + (oFacility.Currency || "INR");
                    oFacility.SelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                    oFacility.SelectionModeLabel = this._getFacilitySelectionModeLabel(oFacility.SelectionMode);

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

       

        _openFacilitySelectionDialog: function (oFacility) {
            const oSelectionModel = this.getView().getModel("FacilitySelection");
            const sPlan = oFacility.CurrentPriceType || "Unit Price";
            const fPrice = oFacility.CurrentPrice || oFacility.UnitPrice || 0;
            const sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            const bIsSingleOccupant = this._isSingleOccupantBooking();
            const sPrimaryGuestName = this._getPrimaryGuestName();

            let aPersonOptions = this._getOccupantOptions() || [];
            let aPersonQuantities = oFacility.PersonQuantities || [];
            let aSelectedPersonIds = Array.isArray(oFacility.SelectedPersonIds) ? oFacility.SelectedPersonIds.slice() : [];
            let iSinglePersonQty = 1;

            if (bIsSingleOccupant && sSelectionMode === "PERSON") {
                aSelectedPersonIds = ["SELF"];
            }

            if (sSelectionMode === "PERSON_QTY") {
                aPersonQuantities = this._buildFacilityPersonLines(oFacility);

                if (bIsSingleOccupant) {
                    aPersonQuantities = [{
                        personId: "SELF",
                        personName: sPrimaryGuestName,
                        selected: true,
                        qty: Math.max(parseInt((aPersonQuantities[0] && aPersonQuantities[0].qty) || 0, 10), 0)
                    }];
                    iSinglePersonQty = aPersonQuantities[0].qty || 1;
                    aSelectedPersonIds = ["SELF"];
                }
            }

            oSelectionModel.setData({
                title: oFacility.FacilityName,
                DisplayPrice: fPrice + " " + (oFacility.Currency || "INR"),
                selectionMode: sSelectionMode,
                selectionModeLabel: oFacility.SelectionModeLabel || this._getFacilitySelectionModeLabel(sSelectionMode),
                singleOccupantMode: bIsSingleOccupant,
                primaryGuestName: sPrimaryGuestName,
                quantity: oFacility.Quantity || 1,
                singlePersonQty: iSinglePersonQty,
                selectedPriceType: sPlan,
                selectedPrice: fPrice,
                selectedPersonIds: aSelectedPersonIds,
                personQuantities: Array.isArray(aPersonQuantities) ? aPersonQuantities : [],
                personOptions: Array.isArray(aPersonOptions) ? aPersonOptions : []
            });

            this._getFacilitySelectionDialog().data("facilityRef", oFacility);
            this._oFacilityRemoveButton.setVisible(!!oFacility.Selected);
            this._oFacilityDialog.open();
        },

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

            const oDialog = new sap.m.Dialog({
                title: "{FacilitySelection>/title}",
                contentWidth: "30rem",
                stretch: false,
                verticalScrolling: true,
                horizontalScrolling: false,
                content: [
                    new sap.m.VBox({
                        width: "100%",
                        items: [
                            new sap.m.ObjectStatus({
                                text: "{FacilitySelection>/selectionModeLabel}",
                                state: "Information"
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            new sap.m.Label({
                                text: "Price",
                                design: "Bold"
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            new sap.m.Label({
                                text: "{FacilitySelection>/DisplayPrice}",
                                design: "Bold"
                            }).addStyleClass("sapUiSmallMarginBottom"),

                            new sap.m.Label({
                                text: "Quantity",
                                design: "Bold",
                                visible: {
                                    path: "FacilitySelection>/selectionMode",
                                    formatter: function (sSelectionMode) {
                                        return sSelectionMode === "QTY";
                                    }
                                }
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            new sap.m.StepInput({
                                width: "100%",
                                min: 1,
                                value: "{FacilitySelection>/quantity}",
                                visible: {
                                    path: "FacilitySelection>/selectionMode",
                                    formatter: function (sSelectionMode) {
                                        return sSelectionMode === "QTY";
                                    }
                                }
                            }).addStyleClass("sapUiSmallMarginBottom"),

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
                                        width: "96%",
                                        columns: [
                                            new sap.m.Column({
                                                width: "5rem",
                                                header: new sap.m.Text({ text: "Pick" })
                                            }),
                                            new sap.m.Column({
                                                header: new sap.m.Text({ text: "Person" })
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
                                                        select: this.onFacilityPersonSelect.bind(this)
                                                    }),
                                                    new sap.m.Text({
                                                        text: "{FacilitySelection>name}"
                                                    })
                                                ]
                                            })
                                        }
                                    }).addStyleClass("sapUiSmallMarginEnd"),
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom"),

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
                                    })
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom"),

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
                                    new sap.m.Label({
                                        text: "Person-wise quantity breakdown",
                                        design: "Bold"
                                    }).addStyleClass("sapUiTinyMarginBottom"),

                                    new sap.m.Table({
                                        inset: false,
                                        growing: false,
                                        width: "96%",
                                        columns: [
                                            new sap.m.Column({
                                                width: "5rem",
                                                header: new sap.m.Text({ text: "Pick" })
                                            }),
                                            new sap.m.Column({
                                                header: new sap.m.Text({ text: "Person" })
                                            }),
                                            new sap.m.Column({
                                                width: "10rem",
                                                header: new sap.m.Text({ text: "Qty" })
                                            })
                                        ],
                                        items: {
                                            path: "FacilitySelection>/personQuantities",
                                            template: new sap.m.ColumnListItem({
                                                cells: [
                                                    new sap.m.CheckBox({
                                                        selected: "{FacilitySelection>selected}",
                                                        select: this.onFacilityPersonSelect.bind(this)
                                                    }),
                                                    new sap.m.Text({
                                                        text: "{FacilitySelection>personName}"
                                                    }),
                                                    new sap.m.StepInput({
                                                        min: 0,
                                                        step: 1,
                                                        value: "{FacilitySelection>qty}",
                                                        enabled: "{FacilitySelection>selected}",
                                                        change: this.onLaundryQtyChange.bind(this)
                                                    })
                                                ]
                                            })
                                        }
                                    }).addStyleClass("sapUiSmallMarginEnd"),
                                ]
                            }),

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
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    new sap.m.Label({
                                        text: "Quantity",
                                        design: "Bold"
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    new sap.m.StepInput({
                                        width: "100%",
                                        min: 0,
                                        step: 1,
                                        value: "{FacilitySelection>/singlePersonQty}"
                                    })
                                ]
                            }).addStyleClass("sapUiSmallMarginBottom")
                        ]
                    }).addStyleClass("sapUiContentPadding sapUiSmallMargin")
                ],
                buttons: [
                    this._oFacilityRemoveButton = new sap.m.Button({
                        text: "Remove",
                        type: "Transparent",
                        visible: false,
                        press: this.onFacilityDialogRemove.bind(this)
                    }),
                    new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            oDialog.close();
                        }
                    }),
                    new sap.m.Button({
                        text: "Confirm",
                        type: "Emphasized",
                        press: this.onFacilityDialogConfirm.bind(this)
                    })
                ]
            });

            this.getView().addDependent(oDialog);
            this._oFacilityDialog = oDialog;
            return this._oFacilityDialog;
        },
        onFacilityDialogConfirm: function (oEvent) {
            const oDialog = oEvent.getSource().getParent();
            const oFacility = oDialog.data("facilityRef");
            const oSelectionModel = this.getView().getModel("FacilitySelection");

            const sSelectionMode = oSelectionModel.getProperty("/selectionMode");
            const bIsSingleOccupant = !!oSelectionModel.getProperty("/singleOccupantMode");
            const sPrimaryGuestName = oSelectionModel.getProperty("/primaryGuestName") || "Primary Guest";
            const iQuantity = Math.max(parseInt(oSelectionModel.getProperty("/quantity"), 10) || 1, 1);
            const fSelectedPrice = oSelectionModel.getProperty("/selectedPrice") || 0;
            const sSelectedPriceType = oSelectionModel.getProperty("/selectedPriceType") || "";
            const iSinglePersonQty = Math.max(parseInt(oSelectionModel.getProperty("/singlePersonQty"), 10) || 0, 0);

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
                aSelectedPersonIds = ["SELF"];
            }

            if (bIsSingleOccupant && sSelectionMode === "PERSON_QTY") {
                aSelectedPersonIds = ["SELF"];
                aPersonQuantities = [{
                    personId: "SELF",
                    personName: sPrimaryGuestName,
                    qty: iSinglePersonQty
                }];
            }

            if (sSelectionMode === "PERSON" && aSelectedPersonIds.length === 0) {
                sap.m.MessageToast.show("Please choose at least one person.");
                return;
            }

            if (sSelectionMode === "PERSON_QTY") {
                if (aPersonQuantities.length === 0) {
                    sap.m.MessageToast.show("Please choose at least one person.");
                    return;
                }

                const iTotalQty = aPersonQuantities.reduce(function (iSum, oLine) {
                    return iSum + oLine.qty;
                }, 0);

                if (iTotalQty <= 0) {
                    sap.m.MessageToast.show("Please enter quantity for selected person(s).");
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
            oFacility.SelectedPersonIds = aSelectedPersonIds.slice();
            oFacility.PersonQuantities = aPersonQuantities;

            this._setFacilitySelectionSummary(oFacility);

            this.getView().getModel("FacilityModel").refresh(true);
            this._resetCouponState(true);
            this._renderFacilityCards();
            this._rebuildSelectedFacilities();
            this._recalculateSummary();

            oDialog.close();
        },


        _setFacilitySelectedPrice: function (oFacility, sSelectedType, fSelectedPrice, iQuantity, aSelectedPersonIds, aPersonQuantities) {
            oFacility.Selected = true;
            oFacility.SelectedPrice = fSelectedPrice;
            oFacility.SelectedPriceType = sSelectedType;
            oFacility.Quantity = iQuantity || 1;
            oFacility.SelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            oFacility.SelectionModeLabel = this._getFacilitySelectionModeLabel(oFacility.SelectionMode);
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
            this._resetCouponState(true);
            this._renderFacilityCards();
            this._rebuildSelectedFacilities();
            this._recalculateSummary();
        },


     

        onFacilityDialogRemove: function (oEvent) {
            const oDialog = oEvent.getSource().getParent();
            const oFacility = oDialog.data("facilityRef");

            oFacility.Selected = false;
            oFacility.SelectedPrice = 0;
            oFacility.SelectedPriceType = "";
            oFacility.Quantity = 1;
            oFacility.SelectedPersonIds = [];
            oFacility.PersonQuantities = [];
            oFacility.SelectionSummary = "";

            this.getView().getModel("FacilityModel").refresh(true);
            this._resetCouponState(true);
            this._renderFacilityCards();
            this._rebuildSelectedFacilities();
            this._recalculateSummary();
            oDialog.close();
        },

        _clearSelectedFacilities: function () {
            (this._aAllFacilities || []).forEach(function (oFacility) {
                oFacility.Selected = false;
                oFacility.SelectedPrice = 0;
                oFacility.SelectedPriceType = "";
                oFacility.Quantity = 1;
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

                        const iTotalQty = aValidLines.reduce(function (iSum, oLine) {
                            return iSum + (parseInt(oLine.qty, 10) || 0);
                        }, 0);

                        const aNames = aValidLines.map(function (oLine) {
                            const sName = oLine.personName || fnGetPersonName(oLine.personId);
                            const iQty = parseInt(oLine.qty, 10) || 0;
                            return sName + "(" + iQty + ")";
                        });

                        fTotal = fPrice * fPeriodMultiplier * iTotalQty;
                        sBreakdown = "Breakdown: " + aNames.join(", ") + " x " + fPeriodMultiplier + " " + sPriceType;
                        sAllocationDetails = JSON.stringify({
                            selectionMode: sSelectionMode,
                            totalQuantity: iTotalQty,
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
                        FacilityName: oFacility.FacilityName,
                        Currency: sCurrency,
                        SelectionMode: sSelectionMode,
                        Price: fPrice,
                        UnitText: sPriceType,
                        Quantity: Math.max(parseInt(oFacility.Quantity, 10) || 1, 1),
                        SelectedPersonIds: aSelectedPersonIds.slice(),
                        PersonQuantities: aPersonQuantities.map(function (oLine) {
                            return {
                                personId: oLine.personId,
                                personName: oLine.personName || fnGetPersonName(oLine.personId),
                                qty: Math.max(parseInt(oLine.qty, 10) || 0, 0)
                            };
                        }),
                        AllocationDetails: sAllocationDetails,
                        RateText: fPrice + " " + sCurrency + " / " + sPriceType,
                        TotalAmount: Number(fTotal.toFixed(2)),
                        BreakdownText: sBreakdown
                    };
                }.bind(this));

            oModel.setProperty("/AllSelectedFacilities", aSelectedFacilities);
            oModel.setProperty(
                "/TotalFacilityPrice",
                Number(
                    aSelectedFacilities.reduce(function (sum, oItem) {
                        return sum + (this._toNumber(oItem.TotalAmount));
                    }.bind(this), 0).toFixed(2)
                )
            );
        },


        _getFacilityMultiplierLabel: function (sSelectedPriceType, oUnits) {
            if (sSelectedPriceType === "Per Day") {
                return oUnits.days + " day(s)";
            }
            if (sSelectedPriceType === "Per Month") {
                return oUnits.months + " month(s)";
            }
            if (sSelectedPriceType === "Per Year") {
                return oUnits.years + " year(s)";
            }
            return "1 unit";
        },

        _buildFacilityPriceOptions: function (oFacility) {
            const aOptions = [];
            const bIsUnitBasedFacility = this._isUnitBasedFacility(oFacility);

            if (bIsUnitBasedFacility && this._toNumber(oFacility.UnitPrice) > 0) {
                aOptions.push({
                    key: "Unit Price",
                    text: "Unit Price - " + this._toNumber(oFacility.UnitPrice) + " " + oFacility.Currency,
                    price: this._toNumber(oFacility.UnitPrice)
                });

                return aOptions;
            }

            if (this._toNumber(oFacility.PricePerDay) > 0) {
                aOptions.push({
                    key: "Per Day",
                    text: "Per Day - " + this._toNumber(oFacility.PricePerDay) + " " + oFacility.Currency,
                    price: this._toNumber(oFacility.PricePerDay)
                });
            }

            if (this._toNumber(oFacility.PricePerMonth) > 0) {
                aOptions.push({
                    key: "Per Month",
                    text: "Per Month - " + this._toNumber(oFacility.PricePerMonth) + " " + oFacility.Currency,
                    price: this._toNumber(oFacility.PricePerMonth)
                });
            }

            if (this._toNumber(oFacility.PricePerYear) > 0) {
                aOptions.push({
                    key: "Per Year",
                    text: "Per Year - " + this._toNumber(oFacility.PricePerYear) + " " + oFacility.Currency,
                    price: this._toNumber(oFacility.PricePerYear)
                });
            }

            return aOptions;
        },


        onAddFamilyMember: function () {
            const oBookingView = this.getView().getModel("BookingView");
            const aMembers = oBookingView.getProperty("/FamilyMembers") || [];
            const bHasPendingRow = aMembers.some(function (oMember) {
                return oMember.IsNew;
            });

            if (bHasPendingRow) {
                MessageToast.show("Please complete the current new member row first.");
                return;
            }

            aMembers.push({
                id: "FM" + Date.now(),
                Name: "",
                Relation: "",
                Age: "",
                Selected: false,
                DocumentType: "",
                DocumentName: "",
                DocumentFile: null,
                IsNew: true
            });

            oBookingView.setProperty("/FamilyMembers", aMembers);
            oBookingView.refresh(true);
        },

        onFamilyDocumentChange: function (oEvent) {
            const oFileUploader = oEvent.getSource();
            const oContext = oFileUploader.getBindingContext("BookingView");
            const sPath = oContext.getPath();
            const oModel = this.getView().getModel("BookingView");
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            const oReader = new FileReader();

            if (!oFile) {
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

        onSaveFamilyMember: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("BookingView");
            const sPath = oContext.getPath();
            const oModel = this.getView().getModel("BookingView");

            const oMember = Object.assign({}, oModel.getProperty(sPath));

            if (!oMember.Name || !oMember.Name.trim()) {
                MessageToast.show("Please enter member name.");
                return;
            }

            if (!oMember.Relation || !oMember.Relation.trim()) {
                MessageToast.show("Please enter relation.");
                return;
            }

            if (!oMember.Age || isNaN(parseInt(oMember.Age, 10))) {
                MessageToast.show("Please enter valid age.");
                return;
            }

            if (!oMember.DocumentType) {
                MessageToast.show("Please select document type.");
                return;
            }

            if (!oMember.DocumentName) {
                MessageToast.show("Please upload a document.");
                return;
            }

            oMember.IsNew = false;
            oModel.setProperty(sPath, oMember);
            oModel.refresh(true);

            MessageToast.show("Member added successfully.");
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
                return;
            }

            const iStart = this._iFacilityStartIndex || 0;
            const iPageSize = this._iFacilityPageSize || 3;
            const aVisibleFacilities = aFacilities.slice(iStart, iStart + iPageSize);

            const oRow = new sap.m.HBox({
                width: "100%",
                justifyContent: "Start",
                alignItems: "Start",
                wrap: "NoWrap"
            }).addStyleClass("sapUiSmallMarginTop");

            aVisibleFacilities.forEach(function (oFacility) {
                const oCard = new sap.m.VBox({
                    width: "290px",
                    alignItems: "Center",
                    justifyContent: "Center",
                    items: [
                        new sap.m.VBox({
                            width: "264px",
                            height: "178px",
                            items: [
                                new sap.m.HBox({
                                    visible: !!oFacility.Selected,
                                    items: [
                                        new sap.m.Text({ text: "ADDED" })
                                    ]
                                }).addStyleClass("selectedBadge"),
                                new sap.m.Image({
                                    src: oFacility.Image,
                                    width: "264px",
                                    height: "178px",
                                    densityAware: false,
                                    decorative: false
                                }).addStyleClass("serviceImage"),
                                new sap.m.Text({
                                    text: oFacility.FacilityName,
                                    textAlign: "Center"
                                }).addStyleClass("facilityOverlayText")
                            ]
                        }).addStyleClass("imageContainer"),
                        new sap.m.Text({
                            visible: !!oFacility.Selected,
                            text: oFacility.SelectionSummary || ""
                        }).addStyleClass("facilityPriceText")
                    ]
                }).addStyleClass("serviceCard sapUiSmallMarginEnd");

                if (oFacility.Selected) {
                    oCard.addStyleClass("serviceCardSelected");
                }

                oCard.attachBrowserEvent("click", this.onFacilityCardPress.bind(this, oFacility));
                oRow.addItem(oCard);
            }.bind(this));

            oContainer.addItem(oRow);
        },

        _onRouteMatched: async function () {
            let oHostelModel = sap.ui.getCore().getModel("HostelModel");
            if (!oHostelModel) {
                oHostelModel = new JSONModel({});
                sap.ui.getCore().setModel(oHostelModel, "HostelModel");
            }

            this.getView().setModel(oHostelModel, "HostelModel");
            this.getView().setModel(new JSONModel({
                PropertyTypes: [
                    { key: "Hostel", text: "Hostel" },
                    { key: "PG", text: "PG" },
                    { key: "Hotel", text: "Hotel" },
                    { key: "Service Apartments", text: "Service Apartments" },
                    { key: "Rented Properties", text: "Rented Properties" }
                ],
                DurationOptions: this._buildKeyTextList(11),
                showDurationSelector: false,
                endDateEditable: false,
                showFamilySection: false,
                showGSTField: false,
                showBusinessTravelOption: false,
                showBusinessGSTSection: false,
                maxPersons: 1,
                originalPersonOptions: [],
                DocumentTypeOptions: [
                    { key: "Aadhaar", text: "Aadhaar" },
                    { key: "Passport", text: "Passport" },
                    { key: "Driving License", text: "Driving License" },
                    { key: "Voter ID", text: "Voter ID" }
                ],
                FamilyMembers: []

            }), "BookingView");
            this.getView().setModel(new JSONModel({ Facilities: [] }), "FacilityModel");
            this.getView().setModel(new JSONModel({
                title: "",
                facilityName: "",
                currency: "",
                selectionMode: "SINGLE",
                selectionModeLabel: "",
                singleOccupantMode: false,
                primaryGuestName: "",
                quantity: 1,
                singlePersonQty: 0,
                selectedPriceType: "",
                personOptions: [],
                selectedPersonIds: [],
                personQuantities: [],
                priceOptions: []
            }), "FacilitySelection");
            this.getView().setModel(new JSONModel({
                Amount: 0,
                PaymentType: "PayOnCheckIn",
                PaymentDate: "",
                BankTransactionID: ""
            }), "PaymentModel");

            this._initializeBookingData();
            this._prefillLoggedInUser();
            this._syncPropertyTypeState();
            this._syncPlanState();
            await this._loadFacilities();
            this._rebuildSelectedFacilities();
            this._recalculateSummary();
            oHostelModel.refresh(true);
        },

        _initializeBookingData: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oData = oModel.getData() || {};
            const oBookingView = this.getView().getModel("BookingView");
            const oToday = new Date();
            const aPaymentMethods = [];
            let aOriginalPersonOptions = Array.isArray(oData.NoOfPersonsList) ? oData.NoOfPersonsList.slice() : [];
            const iCapacity = Math.max(parseInt(oData.Capacity, 10) || 1, 1);

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

            oModel.setProperty("/PropertyType", oData.PropertyType || "Hostel");
            oModel.setProperty("/AvailablePaymentMethods", aPaymentMethods);
            oModel.setProperty("/SelectedMonths", String(oData.SelectedMonths || "1"));
            oModel.setProperty("/TodayDate", oData.TodayDate instanceof Date ? oData.TodayDate : oToday);
            oModel.setProperty("/AllSelectedFacilities", Array.isArray(oData.AllSelectedFacilities) ? oData.AllSelectedFacilities : []);
            oModel.setProperty("/TotalFacilityPrice", this._toNumber(oData.TotalFacilityPrice));
            oModel.setProperty("/CouponCode", oData.CouponCode || "");
            oModel.setProperty("/AppliedDiscount", this._toNumber(oData.AppliedDiscount));
            oModel.setProperty("/AppliedCouponCode", oData.AppliedCouponCode || "");
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
            oModel.setProperty("/BookingPayload", oData.BookingPayload || null);

            if (!oData.SelectedPriceType && aPaymentMethods.length > 0) {
                oModel.setProperty("/SelectedPriceType", aPaymentMethods[0].key);
            }

            oModel.setProperty("/SelectedPerson", String(oData.SelectedPerson || "1"));
            this._applySelectedPlanPrice();
        },

        _prefillLoggedInUser: function () {
            const oLoginModel = sap.ui.getCore().getModel("LoginModel");
            const oHostelModel = this.getView().getModel("HostelModel");

            if (!oLoginModel || !oHostelModel) {
                return;
            }

            const oUser = oLoginModel.getData() || {};

            oHostelModel.setProperty("/FullName", oUser.UserName || oHostelModel.getProperty("/FullName") || "");
            oHostelModel.setProperty("/CustomerEmail", oUser.EmailID || oHostelModel.getProperty("/CustomerEmail") || "");
            oHostelModel.setProperty("/MobileNo", oUser.MobileNo || oHostelModel.getProperty("/MobileNo") || "");
            oHostelModel.setProperty("/Country", oUser.Country || oHostelModel.getProperty("/Country") || "");
            oHostelModel.setProperty("/State", oUser.State || oHostelModel.getProperty("/State") || "");
            oHostelModel.setProperty("/City", oUser.City || oHostelModel.getProperty("/City") || "");
            oHostelModel.setProperty("/Address", oHostelModel.getProperty("/Address") || oUser.Address || "");
        },

        _syncPropertyTypeState: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            const sPropertyType = String(oModel.getProperty("/PropertyType") || "").trim();
            const bSinglePersonOnly = this._isSinglePersonOnlyPropertyType(sPropertyType);
            const bSupportsCustomerGST = this._supportsCustomerGSTOverride(sPropertyType);
            const iCapacity = Math.max(parseInt(oModel.getProperty("/Capacity"), 10) || 1, 1);
            const aOriginalOptions = this._buildKeyTextList(iCapacity);
            const aFamilyMembers = oBookingView.getProperty("/FamilyMembers") || [];

            oBookingView.setProperty("/showGSTField", this._shouldShowGSTField(sPropertyType));
            oBookingView.setProperty("/showBusinessTravelOption", bSupportsCustomerGST);
            oBookingView.setProperty("/showBusinessGSTSection", bSupportsCustomerGST && !!oModel.getProperty("/IsBusinessTravel"));

            if (!bSupportsCustomerGST) {
                this._resetBusinessTravelData();
                oBookingView.setProperty("/showBusinessGSTSection", false);
            }

            if (bSinglePersonOnly) {
                oBookingView.setProperty("/showFamilySection", false);
                oBookingView.setProperty("/maxPersons", 1);
                oModel.setProperty("/NoOfPersonsList", [{ key: "1", text: "1" }]);
                oModel.setProperty("/SelectedPerson", "1");
                aFamilyMembers.forEach(function (oMember) {
                    oMember.Selected = false;
                });
                oBookingView.refresh(true);
                this._syncSelectedFacilityPersonsWithOccupants();
                return;
            }

            oBookingView.setProperty("/showFamilySection", true);
            oBookingView.setProperty("/maxPersons", iCapacity);
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
                "extra bed": "./image/ExtraBed.jpg"
            };
            const sTypeKey = String(oFacility.Type || "").toLowerCase().trim();
            const sFallback = mDefaultTypeImages[sTypeKey] || "./image/Fallback.png";
            const sBase64 = String(oFacility.Photo1 || "").replace(/\s/g, "");

            if (!sBase64) {
                return sFallback;
            }

            try {
                if (!sBase64.startsWith("data:image")) {
                    atob(sBase64.substring(0, 40));
                    return "data:" + (oFacility.Photo1Type || "image/jpeg") + ";base64," + sBase64;
                }

                return sBase64;
            } catch (oError) {
                return sFallback;
            }
        },



        onFacilityNext: function () {
            const aFacilities = this.getView().getModel("FacilityModel").getProperty("/Facilities") || [];
            const iPageSize = this._iFacilityPageSize || 3;
            const iMaxStart = Math.max(aFacilities.length - iPageSize, 0);

            this._iFacilityStartIndex = Math.min((this._iFacilityStartIndex || 0) + iPageSize, iMaxStart);
            this._renderFacilityCards();
        },

        onFacilityPrev: function () {
            const iPageSize = this._iFacilityPageSize || 3;
            this._iFacilityStartIndex = Math.max((this._iFacilityStartIndex || 0) - iPageSize, 0);
            this._renderFacilityCards();
        },


        onFacilityCardPress: function (oFacility, oEvent) {
            this._openFacilitySelectionDialog(oFacility);
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
            this._resetCouponState(true);
            this._applySelectedPlanPrice();
            this._syncPlanState();
            this._applyFacilityPriceFilter();
            this._recalculateSummary();
        },

        onDurationChange: function (oEvent) {
            const oModel = this.getView().getModel("HostelModel");

            oModel.setProperty("/SelectedMonths", oEvent.getSource().getSelectedKey() || "1");
            this._resetCouponState(false);
            this._updateAutoEndDate();
            this._rebuildSelectedFacilities();
            this._recalculateSummary();
        },

        onStartDateChange: function () {
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
                this._resetCouponState(false);
                this._rebuildSelectedFacilities();
                this._recalculateSummary();
                return;
            }

            if (sPlan === "Per Month" || sPlan === "Per Year") {
                this._updateAutoEndDate();
            }

            this._resetCouponState(false);
            this._rebuildSelectedFacilities();
            this._recalculateSummary();
        },

        onEndDateChange: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oStartDate = this._parseDate(oModel.getProperty("/StartDate"));
            const oEndDate = this._parseDate(oModel.getProperty("/EndDate"));

            if (oModel.getProperty("/SelectedPriceType") === "Per Day" && oStartDate && oEndDate && oEndDate <= oStartDate) {
                MessageToast.show("End date must be after start date");
                oModel.setProperty("/EndDate", "");
                oModel.setProperty("/TotalDays", 0);
                this._resetCouponState(false);
                this._rebuildSelectedFacilities();
                this._recalculateSummary();
                return;
            }

            this._resetCouponState(false);
            this._rebuildSelectedFacilities();
            this._recalculateSummary();
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
            this._resetCouponState(false);
            this._syncPropertyTypeState();
            this._rebuildSelectedFacilities();
            this._recalculateSummary();
        },

        onFamilyMemberSelect: function (oEvent) {
            const oBookingView = this.getView().getModel("BookingView");
            const oMember = oEvent.getSource().getBindingContext("BookingView").getObject();

            if (oMember.IsNew) {
                MessageToast.show("Please add the member first.");
                oEvent.getSource().setSelected(false);
                return;
            }

            const bSelected = oEvent.getSource().getSelected();
            const iMaxPersons = parseInt(oBookingView.getProperty("/maxPersons"), 10) || 1;
            const iOtherSelected = (oBookingView.getProperty("/FamilyMembers") || []).filter(function (oItem) {
                return oItem.id !== oMember.id && oItem.Selected;
            }).length;
            const iNewTotal = 1 + iOtherSelected + (bSelected ? 1 : 0);

            if (bSelected && iNewTotal > iMaxPersons) {
                MessageToast.show("Selected room capacity does not allow more members.");
                oEvent.getSource().setSelected(false);
                oMember.Selected = false;
                return;
            }

            oMember.Selected = bSelected;
            oBookingView.refresh(true);
            this._updateSelectedPersonsFromFamily();
            this._syncSelectedFacilityPersonsWithOccupants();
            this._rebuildSelectedFacilities();
            this._recalculateSummary();
        },
        onDeleteFamilyMemberRow: function (oEvent) {
            const oModel = this.getView().getModel("BookingView");
            const oContext = oEvent.getSource().getBindingContext("BookingView");
            const sPath = oContext.getPath(); // e.g. /FamilyMembers/3
            const aMembers = oModel.getProperty("/FamilyMembers") || [];
            const iIndex = parseInt(sPath.split("/").pop(), 10);

            if (!isNaN(iIndex) && iIndex > -1) {
                aMembers.splice(iIndex, 1);
                oModel.setProperty("/FamilyMembers", aMembers);
                oModel.refresh(true);
                this._updateSelectedPersonsFromFamily();
                this._syncSelectedFacilityPersonsWithOccupants();
                this._rebuildSelectedFacilities();
                this._recalculateSummary();
                MessageToast.show("Row deleted.");
            }
        },



        _updateSelectedPersonsFromFamily: function () {
            const oModel = this.getView().getModel("HostelModel");
            const oBookingView = this.getView().getModel("BookingView");
            let iSelectedPerson = 1;

            if (oBookingView.getProperty("/showFamilySection")) {
                iSelectedPerson += (oBookingView.getProperty("/FamilyMembers") || []).filter(function (oMember) {
                    return oMember.Selected;
                }).length;
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
                    return String(oCoupon.CouponCode || "").toUpperCase() === sEnteredCode.toUpperCase();
                });

                if (!oMatchedCoupon) {
                    MessageToast.show("Invalid coupon code");
                    return;
                }

                if (Number(oMatchedCoupon.couponUsedCount || 0) >= Number(oMatchedCoupon.MaxUses || 0)) {
                    MessageToast.show("This coupon has already been used");
                    return;
                }

                if (String(oMatchedCoupon.BranchCode || "").trim() && String(oMatchedCoupon.BranchCode || "").trim() !== String(sBranchCode || "").trim()) {
                    MessageToast.show("This coupon is not valid for the selected branch.");
                    return;
                }

                if (this._isCouponExpired(oMatchedCoupon.EndDate)) {
                    MessageToast.show("Coupon is expired");
                    return;
                }

                if (this._isCouponNotStarted(oMatchedCoupon.StartDate)) {
                    MessageToast.show("Coupon is not active yet");
                    return;
                }

                if (fCouponBaseAmount < Number(oMatchedCoupon.MinOrderValue || 0)) {
                    MessageToast.show("Minimum order value is not met for this coupon.");
                    return;
                }

                if (String(oMatchedCoupon.DiscountType || "").toLowerCase() === "percentage") {
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
                this._recalculateSummary();
                MessageToast.show("Coupon applied successfully");
            } catch (oError) {
                MessageToast.show("Error applying coupon");
            } finally {
                this.closeBusyDialog();
            }
        },

        onRemoveCoupon: function () {
            this._resetCouponState(true);
            this._recalculateSummary();
        },

        _resetCouponState: function (bKeepTypedValue) {
            const oModel = this.getView().getModel("HostelModel");

            if (!bKeepTypedValue) {
                oModel.setProperty("/CouponCode", "");
            }
            oModel.setProperty("/AppliedDiscount", 0);
            oModel.setProperty("/AppliedCouponCode", "");
        },



        _getCouponBaseAmount: function () {
            const oModel = this.getView().getModel("HostelModel");
            return this._toNumber(oModel.getProperty("/RoomPrice")) + this._toNumber(oModel.getProperty("/TotalFacilityPrice"));
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
            const fDiscount = this._toNumber(oModel.getProperty("/AppliedDiscount"));
            const sPropertyType = String(oModel.getProperty("/PropertyType") || "").trim();
            const bSupportsCustomerGST = this._supportsCustomerGSTOverride(sPropertyType);
            const sGSTType = String(oModel.getProperty("/GSTType") || "").trim();
            const fGSTValue = this._toNumber(oModel.getProperty("/GSTValue"));
            const sPropertyGSTIN = String(oModel.getProperty("/PropertyGSTIN") || oModel.getProperty("/GSTIN") || "").trim().toUpperCase();
            const sCustomerGSTIN = String(oModel.getProperty("/CustomerGSTIN") || "").trim().toUpperCase();
            const iDuration = parseInt(oModel.getProperty("/SelectedMonths") || "1", 10) || 1;
            const oStartDate = this._parseDate(oModel.getProperty("/StartDate"));
            const oEndDate = this._parseDate(oModel.getProperty("/EndDate"));
            const iPersons = this._getSelectedPersonCount();
            const bSinglePersonOnly = this._isSinglePersonOnlyPropertyType(sPropertyType);
            const iRoomMultiplier = bSinglePersonOnly ? 1 : iPersons;
            let fRoomPrice = fBasePrice;
            let iDays = 0;
            let sRoomBreakdown = fBasePrice + " " + (oModel.getProperty("/Currency") || "");
            let fSubTotal = 0;
            let fCGST = 0;
            let fSGST = 0;
            let fIGST = 0;
            let sEffectiveGSTType = sGSTType;
            let fEffectiveGSTValue = 0;
            let sSourceStateCode = "";
            let sCustomerStateCode = "";

            if (sPlan === "Per Day" && oStartDate && oEndDate && oEndDate > oStartDate) {
                iDays = Math.floor((oEndDate - oStartDate) / 86400000);
                fRoomPrice = fBasePrice * iDays;
                sRoomBreakdown = fBasePrice + " x " + iDays + " day(s)";
            } else if ((sPlan === "Per Month" || sPlan === "Per Year") && iDuration > 0) {
                fRoomPrice = fBasePrice * iDuration;
                sRoomBreakdown = fBasePrice + " x " + iDuration + (sPlan === "Per Month" ? " month(s)" : " year(s)");
            }

            if (iRoomMultiplier > 1) {
                fRoomPrice *= iRoomMultiplier;
                sRoomBreakdown += " x " + iRoomMultiplier + " person(s)";
            }

            oModel.setProperty("/TotalDays", iDays);
            oModel.setProperty("/RoomBreakdownText", sRoomBreakdown + " = " + Number(fRoomPrice.toFixed(2)) + " " + (oModel.getProperty("/Currency") || ""));
            oModel.setProperty("/RoomPrice", Number(fRoomPrice.toFixed(2)));

            fSubTotal = Number((fRoomPrice + fFacilityPrice).toFixed(2));

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
                    fCGST = Number((fSubTotal * (fEffectiveGSTValue / 2) / 100).toFixed(2));
                    fSGST = Number((fSubTotal * (fEffectiveGSTValue / 2) / 100).toFixed(2));
                } else if (sEffectiveGSTType === "IGST") {
                    fIGST = Number((fSubTotal * fEffectiveGSTValue / 100).toFixed(2));
                }
            }

            oModel.setProperty("/BookingSubTotal", fSubTotal);
            oModel.setProperty("/CGST", fCGST);
            oModel.setProperty("/SGST", fSGST);
            oModel.setProperty("/IGST", fIGST);
            oModel.setProperty("/EffectiveGSTType", sEffectiveGSTType);
            oModel.setProperty("/EffectiveGSTValue", fEffectiveGSTValue);
            oModel.setProperty("/SourceStateCode", sSourceStateCode);
            oModel.setProperty("/CustomerStateCode", sCustomerStateCode);
            oModel.setProperty("/GrandTotal", Number(Math.max(fSubTotal + fCGST + fSGST + fIGST - fDiscount, 0).toFixed(2)));
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

        _syncPaymentModel: function (sPaymentType) {
            const oPaymentModel = this.getView().getModel("PaymentModel");
            const oHostelModel = this.getView().getModel("HostelModel");
            const sResolvedType = sPaymentType || oPaymentModel.getProperty("/PaymentType") || "PayOnCheckIn";
            const fGrandTotal = this._toNumber(oHostelModel.getProperty("/GrandTotal"));

            oPaymentModel.setProperty("/PaymentType", sResolvedType);
            oPaymentModel.setProperty("/Amount", sResolvedType === "PayOnCheckIn" ? 0 : fGrandTotal);
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
            const oPaymentModel = this.getView().getModel("PaymentModel");
            const sPaymentType = oPaymentModel.getProperty("/PaymentType") || "PayOnCheckIn";
            const sCustomerName = oHostelModel.getProperty("/FullName") || "";

            if (sPaymentType === "PayOnCheckIn") {
                return {
                    Amount: 0,
                    PaymentType: "PayOnCheckIn",
                    BankTransactionID: "",
                    Date: this._getTodayISODate(),
                    BranchCode: oHostelModel.getProperty("/BranchCode") || "",
                    CustomerName: sCustomerName,
                    Currency: oHostelModel.getProperty("/Currency") || "INR",
                    BranchName: this._getBranchName(),
                    BankName: "PayOnCheckIn"
                };
            }

            return {
                Amount: this._toNumber(oPaymentModel.getProperty("/Amount")),
                PaymentType: sPaymentType,
                BankTransactionID: String(oPaymentModel.getProperty("/BankTransactionID") || "").trim(),
                Date: this._formatDateToISO(oPaymentModel.getProperty("/PaymentDate")) || this._getTodayISODate(),
                BranchCode: oHostelModel.getProperty("/BranchCode") || "",
                CustomerName: sCustomerName,
                Currency: oHostelModel.getProperty("/Currency") || "INR",
                BranchName: this._getBranchName(),
                BankName: sPaymentType
            };
        },

        _buildMembersPayload: function () {
            const oBookingView = this.getView().getModel("BookingView");

            return (oBookingView.getProperty("/FamilyMembers") || []).filter(function (oMember) {
                return !oMember.IsNew && !!oMember.Selected;
            }).map(function (oMember) {
                return {
                    Name: oMember.Name || "",
                    Age: parseInt(oMember.Age, 10) || 0,
                    Relation: oMember.Relation || "",
                    DocumentType: oMember.DocumentType || "",
                    File: oMember.File || oMember.Document || "",
                    FileName: oMember.DocumentName || "",
                    FileType: oMember.DocumentFile && oMember.DocumentFile.type ? oMember.DocumentFile.type : ""
                };
            });
        },

        _buildDocumentsPayload: function () {
            const oHostelModel = this.getView().getModel("HostelModel");

            return (oHostelModel.getProperty("/Documents") || []).map(function (oDocument) {
                return {
                    DocumentType: oDocument.DocumentType || "",
                    File: oDocument.File || oDocument.Document || "",
                    FileName: oDocument.FileName || "",
                    FileType: oDocument.FileType || ""
                };
            });
        },

        _getFacilityMemberIdValue: function (oFacility) {
            const oBookingView = this.getView().getModel("BookingView");
            const aFamilyMembers = oBookingView ? (oBookingView.getProperty("/FamilyMembers") || []) : [];
            const aSelectedIds = [];

            if (Array.isArray(oFacility.SelectedPersonIds)) {
                oFacility.SelectedPersonIds.forEach(function (sPersonId) {
                    if (sPersonId && sPersonId !== "SELF" && !aSelectedIds.includes(sPersonId)) {
                        aSelectedIds.push(sPersonId);
                    }
                });
            }

            if (Array.isArray(oFacility.PersonQuantities)) {
                oFacility.PersonQuantities.forEach(function (oLine) {
                    const sPersonId = oLine.personId;
                    const iQty = parseInt(oLine.qty, 10) || 0;

                    if (sPersonId && sPersonId !== "SELF" && iQty > 0 && !aSelectedIds.includes(sPersonId)) {
                        aSelectedIds.push(sPersonId);
                    }
                });
            }

            return aSelectedIds.map(function (sPersonId) {
                const oMatchedMember = aFamilyMembers.find(function (oMember) {
                    return oMember.MemberID === sPersonId || oMember.id === sPersonId;
                });

                return oMatchedMember ? (oMatchedMember.MemberID || oMatchedMember.id || "") : sPersonId;
            }).filter(Boolean).join(",");
        },

        _buildFacilityItemsPayload: function () {
            const oHostelModel = this.getView().getModel("HostelModel");

            return (oHostelModel.getProperty("/AllSelectedFacilities") || []).map(function (oFacility) {
                return {
                    FacilityID: oFacility.FacilityID || "",
                    FacilityName: oFacility.FacilityName || "",
                    FacilitiPrice: this._toNumber(oFacility.TotalAmount).toFixed(2),
                    StartDate: this._formatDateToISO(oHostelModel.getProperty("/StartDate")),
                    EndDate: this._formatDateToISO(oHostelModel.getProperty("/EndDate")),
                    PaidStatus: "Pending",
                    CustomerID: oHostelModel.getProperty("/CustomerID") || "",
                    MemberID: this._getFacilityMemberIdValue(oFacility),
                    SelectionMode: oFacility.SelectionMode || "",
                    Quantity: Math.max(parseInt(oFacility.Quantity, 10) || 1, 1),
                    UnitText: oFacility.UnitText || oFacility.SelectedPriceType || oHostelModel.getProperty("/SelectedPriceType") || "",
                    Currency: oFacility.Currency || oHostelModel.getProperty("/Currency") || "INR",
                    UnitPrice: this._toNumber(oFacility.Price || oFacility.SelectedPrice || oFacility.UnitPrice || 0).toFixed(2),
                    BasicFacilityPrice: this._toNumber(oFacility.Price || oFacility.SelectedPrice || oFacility.UnitPrice || 0).toFixed(2)
                };
            }.bind(this));
        },

        _buildBookingItemsPayload: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const bIsBusinessTravel = !!oHostelModel.getProperty("/IsBusinessTravel");
            const sCustomerGSTIN = String(oHostelModel.getProperty("/CustomerGSTIN") || "").trim().toUpperCase();
            const sCompanyName = String(oHostelModel.getProperty("/CompanyName") || "").trim();
            const sCompanyAddress = String(oHostelModel.getProperty("/CompanyAddress") || "").trim();
            const sEffectiveGSTType = oHostelModel.getProperty("/EffectiveGSTType") || oHostelModel.getProperty("/GSTType") || "";
            const sPropertyGSTIN = oHostelModel.getProperty("/PropertyGSTIN") || oHostelModel.getProperty("/GSTIN") || "";

            return [{
                BookingDate: this._getTodayISODate(),
                RentPrice: this._toNumber(oHostelModel.getProperty("/GrandTotal")).toFixed(2),
                RoomPrice: this._toNumber(oHostelModel.getProperty("/RoomPrice")).toFixed(2),
                NoOfPersons: this._getSelectedPersonCount(),
                StartDate: this._formatDateToISO(oHostelModel.getProperty("/StartDate")),
                EndDate: this._formatDateToISO(oHostelModel.getProperty("/EndDate")),
                Status: "New",
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
                CustomerName: oHostelModel.getProperty("/FullName") || "",
                CustomerGSTIN: bIsBusinessTravel ? sCustomerGSTIN : "",
                CustCompanyName: bIsBusinessTravel ? sCompanyName : "",
                CustCompanyAddress: bIsBusinessTravel ? sCompanyAddress : "",
                CustomerGSTINGSTType: bIsBusinessTravel ? sEffectiveGSTType : "",
                CustomerGSTINGSTValue: bIsBusinessTravel
                    ? String(this._toNumber(oHostelModel.getProperty("/EffectiveGSTValue") || oHostelModel.getProperty("/GSTValue")))
                    : "0"
            }];
        },

        _buildBookingCreatePayload: function () {
            const oHostelModel = this.getView().getModel("HostelModel");

            return {
                data: [{
                    Salutation: oHostelModel.getProperty("/Salutation") || "Mr.",
                    CustomerName: oHostelModel.getProperty("/FullName") || "",
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
                    Members: this._buildMembersPayload(),
                    Documents: this._buildDocumentsPayload(),
                    Booking: this._buildBookingItemsPayload(),
                    FacilityItems: this._buildFacilityItemsPayload(),
                    PaymentDetails: [this._getPaymentPayloadDetails()]
                }]
            };
        },

        _validateBookingBeforePayment: function () {
            const oModel = this.getView().getModel("HostelModel");
            const sPropertyType = String(oModel.getProperty("/PropertyType") || "").trim();
            const bSupportsCustomerGST = this._supportsCustomerGSTOverride(sPropertyType);
            const bIsBusinessTravel = !!oModel.getProperty("/IsBusinessTravel");
            const sCustomerGSTIN = String(oModel.getProperty("/CustomerGSTIN") || "").trim();
            const sCompanyName = String(oModel.getProperty("/CompanyName") || "").trim();
            const sCompanyAddress = String(oModel.getProperty("/CompanyAddress") || "").trim();

            if (!oModel.getProperty("/FullName") || !oModel.getProperty("/StartDate") || !oModel.getProperty("/EndDate")) {
                MessageToast.show("Please fill mandatory booking details");
                return false;
            }

            if (!oModel.getProperty("/CustomerEmail") || !oModel.getProperty("/MobileNo")) {
                MessageToast.show("Please complete contact details before payment");
                return false;
            }

            if (bSupportsCustomerGST && bIsBusinessTravel) {
                if (!sCustomerGSTIN || !sCompanyName || !sCompanyAddress) {
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
                const oPayload = this._buildBookingCreatePayload();
                const oHostelModel = this.getView().getModel("HostelModel");
                this.getBusyDialog();
                const oResponse = await this.ajaxCreateWithJQuery("HM_Customer", oPayload);
                const aBookingDetails = oResponse && oResponse.BookingDetails ? oResponse.BookingDetails : [];
                let sMessage = "Booking created successfully.";

                oHostelModel.setProperty("/BookingPayload", oPayload);

                if (aBookingDetails.length) {
                    sMessage = "Booking created successfully.\n\n" + aBookingDetails.map(function (oItem) {
                        return "Booking ID: " + oItem.BookingID;
                    }).join("\n");
                }

                if (this._oPaymentDialog) {
                    this._oPaymentDialog.close();
                }

                MessageBox.success(sMessage, {
                    title: "Success",
                    onClose: function () {
                        this.getOwnerComponent().getRouter().navTo("RouteHostel");
                    }.bind(this)
                });
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


        onNavBack: function () {
            const sBranchCode = this.getView().getModel("HostelModel").getProperty("/BranchCode");

            if (sBranchCode) {
                this.getOwnerComponent().getRouter().navTo("RouteViewRooms", {
                    sPath: sBranchCode
                });
                return;
            }

            this.getOwnerComponent().getRouter().navTo("RouteHostel");
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
        }
    });
});


