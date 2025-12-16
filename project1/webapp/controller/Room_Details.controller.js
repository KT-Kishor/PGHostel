sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "../model/formatter"
], function (BaseController, JSONModel, utils, MessageToast, Spreadsheet, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Room_Details", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteRoomDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function () {
            // const omodel = new sap.ui.model.json.JSONModel({
            //     // for Database connection
            //     url: "https://rest.kalpavrikshatechnologies.com/",
            //     headers: {
            //         name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            //         password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            //         "Content-Type": "application/json",
            //     },
            //     isRadioVisible: false,
            // });
            // this.getOwnerComponent().setModel(omodel, "LoginModel");

            var model = new JSONModel({
                BranchCode: "",
                RoomNo: "",
                Price: "",

            });
            this.getView().setModel(model, "RoomModel")
            this.onClearAndSearch("RD_id_FilterbarEmployee");
            sap.ui.core.BusyIndicator.show(0);


            await this.BedTypedetails()
            await this._loadBranchCode()
            await this.Onsearch()

            //  sap.ui.core.BusyIndicator.hide();

        },
        _loadBranchCode: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            let aBranchCodes = [];

            if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode
                    .split(",")
                    .map(code => code.trim());
            }

            let filters = {};

            if (oExistingModel.Role !== "") {
                filters = { BranchID: aBranchCodes };
            }
            try {
                const oView = this.getView();

                const oResponse = await this.ajaxReadWithJQuery("HM_Branch", filters);

                const aBranches = Array.isArray(oResponse?.data)
                    ? oResponse.data
                    : (oResponse?.data ? [oResponse.data] : []);

                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "BranchModel");

                console.log("oBranchModel:", oBranchModel.getData());
                console.log("Branch data loaded successfully");
            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
        },

        RD_onDownload: function () {
            const oModel = this.byId("id_ARD_Table").getModel("RoomDetailsModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show("No data available to download.");
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                Price: item.Price ? String(item.Price) : "",
                MonthPrice: item.MonthPrice ? String(item.MonthPrice) : "",
                YearPrice: item.YearPrice ? String(item.YearPrice) : "",
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Room_Details.xlsx",
                worker: false,
            };
            MessageToast.show("Downloading Room Details");
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        createTableSheet: function () {
            return [{
                label: "Branch Code",
                property: "BranchCode",
                type: "string"
            },
            {
                label: "Room Number",
                property: "RoomNo",
                type: "string"
            },
            {
                label: "Bed Type",
                property: "BedTypeName",
                type: "string"
            },
            {
                label: "Extra Bed",
                property: "ExtraBed",
                type: "string"
            },
            {
                label: "Daily Price",
                property: "Price",
                type: "string"
            },
            {
                label: "Monthly Price",
                property: "MonthPrice",
                type: "string"
            },
            {
                label: "Yearly Price",
                property: "YearPrice",
                type: "string"
            }
            ]
        },

        BedTypedetails: function () {
            this.ajaxReadWithJQuery("HM_BedType", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "BedTypeModel");
                this._aAllBedTypes = oFCIAerData;
            })
        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                RD_id_CustomerName1: new Set(),
                RD_id_CompanyName1: new Set(),

            };

            data.forEach(item => {
                uniqueValues.RD_id_CustomerName1.add(item.RoomNo);
                uniqueValues.RD_id_CompanyName1.add(item.BedTypeName);
            });

            let oView = this.getView();
            ["RD_id_CustomerName1", "RD_id_CompanyName1"].forEach(field => {
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
        HM_AddRoom: function (oEvent) {
            var oView = this.getView();
            this.byId("id_ARD_Table").removeSelections();

            // Load dialog fragment (only once)
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Add_Room_Details",
                    this
                );
                oView.addDependent(this.AR_Dialog);
            }

            // Reset RoomModel fields
            var oRoomModel = oView.getModel("RoomModel");
            if (oRoomModel) {
                oRoomModel.setData({
                    BranchCode: "",
                    BedTypeName: "",
                    NoofPerson: "",
                    RoomNo: "",
                    Price: "",
                    _isEditing: false
                });
            }

            // Hide optional fields
            oView.byId("idBedType").setVisible(false);
            // oView.byId("idAcType").setVisible(false);

            // Reset ValueState for inputs
            var aInputIds = [
                "idRoomType12",
                "idBedType",
                "idRoomNumber",
                "idRoomNumber13",
                "idPrice"
            ];

            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Models ---
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");

            var aBedTypes = oBedTypeModel.getProperty("/");
            // this._aAllBedTypes=oBedTypeModel.getProperty("/")
            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // --- Backup BedTypeModel if not already done ---
            if (this._aOriginalBedTypes && this._aOriginalBedTypes.length) {
                oBedTypeModel.setProperty("/", JSON.parse(JSON.stringify(this._aOriginalBedTypes)));
                aBedTypes = oBedTypeModel.getProperty("/");
            } else {
                // Backup original only once
                this._aOriginalBedTypes = JSON.parse(JSON.stringify(aBedTypes));
            }

            // --- Filter Logic ---
            var aFiltered = aBedTypes.filter(function (bed) {
                // Bed side person capacity
                var iBedNoOfPerson = bed.MaxBeds || 0;

                // Sum all NoofPerson for rooms with same BranchCode & BedTypeName
                var iRoomNoOfPerson = aRoomDetails
                    .filter(function (room) {
                        return (
                            room.BranchCode === bed.BranchCode &&
                            room.BedTypeName === bed.Name + " - " + bed.ACType
                        );
                    })
                    .reduce(function (sum, room) {
                        return sum + (parseInt("1") || 0);
                    }, 0);

                // Only include bed types that haven't reached capacity
                return iBedNoOfPerson > iRoomNoOfPerson;
            });

            // Update filtered data for dropdown
            oBedTypeModel.setProperty("/", aFiltered);

            // --- Open Dialog ---
            this.AR_Dialog.open();
        },

        onBranchChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            var oView = this.getView();
            var sBranchCode = oEvent.getParameter("selectedItem").getKey();


            // Models
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");
            var oCurrencyModel = oView.getModel("BranchModel").getData();

            var oCountryModel = this.getView().getModel("CountryModel").getData();

            var Branch = oCurrencyModel.find((item) => {
                return item.BranchID === sBranchCode
            })

            var Currency = oCountryModel.find((item) => {
                return item.countryName === Branch.Country
            })
            this.getView().getModel("RoomModel").setProperty("/Currency", Currency.currency);



            // Get all bed types (from a backup copy)
            var aAllBedTypes = this._aAllBedTypes || oBedTypeModel.getProperty("/");
            this._aAllBedTypes = aAllBedTypes; // store once

            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // Filter only the bed types for the selected branch
            var aFiltered = aAllBedTypes.filter(function (bed) {
                return bed.BranchCode === sBranchCode


            });

            // Set filtered data (for dropdown binding)
            oBedTypeModel.setProperty("/", aFiltered);

            // Reset UI selections
            var oBedTypeCombo = oView.byId("idBedType");
            oBedTypeCombo.setSelectedKey("").setVisible(true);


        },


        onBedTypeChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");

            // var sSelectedBedType = oEvent.getParameter("selectedItem").getKey();
            // var oView = this.getView();

            // // var oAcComboBox = oView.byId("idAcType");

            // // if (sSelectedBedType) {
            // //     oAcComboBox.setVisible(true);
            // // } else {
            // //     oAcComboBox.setVisible(false);
            // //     return;
            // // }

            // var oBedTypeModel = oView.getModel("BedTypeModel");
            // var aData = oBedTypeModel.getProperty("/");
            // var sBranchCode = oView.byId("idRoomType12").getSelectedKey();

            // var oSelected = aData.find(function (item) {
            //     return item.Name === sSelectedBedType;
            // });

            // if (oSelected) {
            //     var aFilteredAC = aData.filter(function (item) {
            //         return item.Name === sSelectedBedType;
            //     });

            //     // Bind this filtered data directly to AC ComboBox (no model overwrite)
            //     oAcComboBox.bindItems({
            //         path: "/",
            //         template: new sap.ui.core.Item({
            //             key: "{ACType}",
            //             text: "{ACType}"
            //         }),
            //         templateShareable: false
            //     });
            //     oAcComboBox.setModel(new sap.ui.model.json.JSONModel(aFilteredAC));
            //     oAcComboBox.setSelectedKey("");
            // }
        },

        HM_EditRoom: function (oEvent) {
            var oView = this.getView();
            var oTable = this.byId("id_ARD_Table");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                sap.m.MessageToast.show("Please select a record to edit the room.");
                return;
            }

            var oContext = oSelected.getBindingContext("RoomDetailsModel");
            var oData = oContext.getObject();

            // Create dialog if not already initialized
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Add_Room_Details",
                    this
                );
                oView.addDependent(this.AR_Dialog);
            }

            // Prepare RoomModel with selected data
            var oRoomModel = oView.getModel("RoomModel");
            oRoomModel.setData({
                ...oData,
                _isEditing: true
            });
            this.RoomNo = oData.RoomNo
            this.BedTypeName = oData.BedTypeName

            var sBranchCode = oData.BranchCode;

            // --- Models ---
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");

            // Get all bed types (use backup if available)
            var aAllBedTypes = this._aAllBedTypes || oBedTypeModel.getProperty("/");
            this._aAllBedTypes = aAllBedTypes;

            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // --- Filter Logic with SUM of NoofPerson ---
            var aFiltered = aAllBedTypes.filter(function (bed) {
                if (bed.BranchCode !== sBranchCode) {
                    return false;
                }

                // Bed capacity
                var iBedNoOfPerson = bed.MaxBeds || 0;

                // Sum NoofPerson for all matching rooms
                var iRoomNoOfPerson = aRoomDetails
                    .filter(function (room) {
                        return (
                            room.BranchCode === sBranchCode &&
                            room.BedTypeName === bed.Name + " - " + bed.ACType
                        );
                    })
                    .reduce(function (sum, room) {
                        return sum + (parseInt("1") || 0);
                    }, 0);

                // Check if this is the current room’s bed
                var bIsCurrentBed =
                    oData.BedTypeName === bed.Name + " - " + bed.ACType &&
                    oData.BranchCode === bed.BranchCode;

                // Include if capacity not reached or if it's the current bed
                return bIsCurrentBed || iBedNoOfPerson > iRoomNoOfPerson;
            });

            // --- If BedType is full, lock dropdown to current one ---
            var oCurrentBedType = aFiltered.find(function (bed) {
                return (
                    bed.Name + " - " + bed.ACType === oData.BedTypeName &&
                    bed.BranchCode === oData.BranchCode
                );
            });

            var oDropdown = oView.byId("idBedType");

            if (aFiltered.length === 1 && oCurrentBedType) {
                // Already full — lock dropdown to this one
                oBedTypeModel.setProperty("/", [oCurrentBedType]);
                if (oDropdown) {
                    oDropdown.setSelectedKey(oData.BedTypeName);
                    // oDropdown.setEnabled(false);
                }
            } else {
                // Otherwise allow selection normally
                oBedTypeModel.setProperty("/", aFiltered);
                if (oDropdown) {
                    // oDropdown.setEnabled(true);
                    oDropdown.setSelectedKey(oData.BedTypeName);
                }
            }

            // Show BedType field
            oView.byId("idBedType").setVisible(true);

            // Reset input ValueState
            var aInputIds = [
                "idRoomType12",
                "idBedType",
                "idRoomNumber",
                "idRoomNumber13",
                "idPrice",
                "id_MonthlyPrice",
                "id_YearlyPrice",
                "FO_id_Currency"
            ];
            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Open Dialog ---
            this.AR_Dialog.open();
        }

        ,

        AR_onCancelButtonPress: function () {

            this.AR_Dialog.close();
            var table = this.byId("id_ARD_Table");
            table.removeSelections(true);
        },
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        AR_onsavebuttonpress: function () {
            var oView = this.getView();
            var oRoomModel = oView.getModel("RoomModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");
            var oBedTypeModel = oView.getModel("BedTypeModel");

            var Payload = oRoomModel.getData();

            // Remove unnecessary fields
            delete Payload.AcType;
            delete Payload.File;
            delete Payload.Description;

            var aRoomDetails = oRoomDetailsModel.getData();
            var aBedTypes = oBedTypeModel.getData();


            var Noofper = aBedTypes.find(function (bed) {
                return bed.BranchCode === Payload.BranchCode && bed.Name === Payload.BedTypeName.split("-")[0].trim() &&
                    bed.ACType === Payload.BedTypeName.split("-").slice(1).join("-").trim();

            });


            // Field validations
            if (
                utils._LCstrictValidationComboBox(oView.byId("idRoomType12"), "ID") &&
                // utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") &&
                (utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") || Payload.BedTypeName) &&
                utils._LCvalidateMandatoryField(oView.byId("idRoomNumber"), "ID") &&
                // utils._LCvalidateMandatoryField(oView.byId("idRoomNumber13"), "ID") &&


                utils._LCstrictValidationComboBox(oView.byId("FO_id_Currency"), "ID")

            ) {

                Payload.NoofPerson = parseInt(Noofper.NoOfPerson) * parseInt(Noofper.MaxBeds) || 0;
                Payload.ExtraBed = parseInt(Payload.ExtraBed) || 0;
                Payload.Price = parseInt(Payload.Price) || 0;

                Payload.MonthPrice = parseInt(Payload.MonthPrice) || 0;

                Payload.YearPrice = parseInt(Payload.YearPrice) || 0;


                // Check if RoomNo already exists
                var oExistingRoom = aRoomDetails.find(function (room) {
                    return room.RoomNo === Payload.RoomNo;
                });



                var selectedBedTypeName = Payload.BedTypeName.split("-")[0].trim();
                var selectedACType = Payload.BedTypeName.split("-").slice(1).join("-").trim();

                var aFiltered = aBedTypes.filter(function (bed) {

                    // Only check selected Bed Type
                    if (
                        bed.BranchCode !== Payload.BranchCode ||
                        bed.Name !== selectedBedTypeName ||
                        bed.ACType !== selectedACType
                    ) {
                        return false;
                    }

                    // Count existing rooms for this bed type
                    var iCreatedCount = aRoomDetails.filter(function (room) {
                        return (
                            room.BranchCode === Payload.BranchCode &&
                            room.BedTypeName === bed.Name + " - " + bed.ACType
                        );
                    }).length;

                    // Check if more rooms can be created
                    return iCreatedCount < Number(bed.MaxBeds);
                });


                if (aFiltered.length === 0 && !Payload._isEditing) {
                    sap.m.MessageToast.show("All rooms for this Bed Type are already created");
                    return;
                }

                if (oExistingRoom && !Payload._isEditing && oExistingRoom.RoomNo === Payload.RoomNo) {
                    sap.m.MessageToast.show("Room No '" + Payload.RoomNo + "' already exists");
                    return;
                }
                if (Payload._isEditing) {
                    // Editing case
                    var sOriginalRoomNo = this.RoomNo; // We'll store this when opening dialog

                    if (oExistingRoom && Payload.RoomNo !== sOriginalRoomNo) {
                        sap.m.MessageToast.show("Room No '" + Payload.RoomNo + "' already exists");
                        return;
                    }
                }
                if (Payload.Price === 0 && Payload.MonthPrice === 0 && Payload.YearPrice === 0) {
                    sap.m.MessageToast.show("Please fill at least one price");
                    return;
                }

                var sUrl = "https://rest.kalpavrikshatechnologies.com/HM_Rooms";
                var sMethod = "POST";
                var oBody = {
                    data: Payload
                };


                if (Payload._isEditing === true) {
                    // Always do PUT when editing
                    sMethod = "PUT";
                    oBody.filters = {
                        RoomNo: this.RoomNo      // Original RoomNo before edit
                    };
                }

                delete Payload._isEditing;

                $.ajax({
                    url: sUrl,
                    method: sMethod,
                    contentType: "application/json",
                    headers: {
                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                    },
                    data: JSON.stringify(oBody),
                    success: function (response) {
                        sap.m.MessageToast.show(
                            sMethod === "POST" ?
                                "Room added successfully!" :
                                "Room updated successfully!"
                        );
                        this.Onsearch("true");
                        this.BedTypedetails()

                        this.AR_Dialog.close();
                    }.bind(this),
                    error: function (err) {
                        sap.m.MessageBox.error("Error saving room data (Add/Update).");
                        console.error(err);
                    }
                });
            } else {
                sap.m.MessageToast.show("Please fill all required fields correctly before saving.");
                return;
            }
        },
        HM_DeleteRoom: function () {
            var table = this.byId("id_ARD_Table");
            var aSelectedItems = table.getSelectedItems();

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show("Please select at least one record to delete.");
                return;
            }

            // Get all selected room numbers for display
            var sRoomNos = aSelectedItems.map(item => {
                return item.getBindingContext("RoomDetailsModel").getObject().RoomNo;
            }).join(", ");

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the selected Room(s): ${sRoomNos}?`, {
                title: "Confirm Deletion",
                icon: sap.m.MessageBox.Icon.WARNING,
                actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                onClose: async function (sAction) {
                    if (sAction === sap.m.MessageBox.Action.OK) {


                        try {
                            // Create delete requests for all selected rooms
                            const deletePromises = aSelectedItems.map((item) => {
                                var data = item.getBindingContext("RoomDetailsModel").getObject();
                                var oBody = {
                                    filters: {
                                        RoomNo: data.RoomNo
                                    }
                                };

                                return $.ajax({
                                    url: "https://rest.kalpavrikshatechnologies.com/HM_Rooms",
                                    method: "DELETE",
                                    contentType: "application/json",
                                    data: JSON.stringify(oBody),
                                    headers: {
                                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                                    }
                                });
                            });
                            sap.ui.core.BusyIndicator.show(0);
                            // Wait for all deletions to finish
                            await Promise.all(deletePromises);


                            // Refresh table + bed details after delete

                            await this.BedTypedetails();
                            await this.Onsearch("true");
                            sap.m.MessageToast.show("Selected room(s) deleted successfully!");

                            //  sap.ui.core.BusyIndicator.hide();

                        } catch (error) {
                            console.error("Delete failed:", error);
                            sap.m.MessageBox.error("Error while deleting room(s). Please try again.");
                        } finally {
                            table.removeSelections(true);
                        }
                    }
                }.bind(this)
            }
            );
        },
        Onsearch: function (flag) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();

            var oView = this.getView();

            var oFilterBar = oView.byId("RD_id_FilterbarEmployee");

            var oTable = oView.byId("id_ARD_Table");
            var oBinding = oTable.getBinding("items");

            var sRoomNo = oView.byId("RD_id_CustomerName1").getSelectedKey() || oView.byId("RD_id_CustomerName1").getValue();
            var sbedtype = oView.byId("RD_id_CompanyName1").getSelectedKey() || oView.byId("RD_id_CompanyName1").getValue();

            let aBranchCodes = [];

            if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode
                    .split(",")
                    .map(code => code.trim());
            }

            let filters = {};

            if (oExistingModel.Role !== "") {
                filters = { BranchCode: aBranchCodes };
            }

            if (sRoomNo) {
                filters.RoomNo = sRoomNo
            }
            if (sbedtype) {
                filters.BedTypeName = sbedtype
            }

            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_Rooms", filters).then((oData) => {

                if (!this._originalRoomdata || flag === "true") {
                    this._originalRoomdata = oData.commentData;
                }
                var model = new JSONModel(oData.commentData);
                this.getView().setModel(model, "RoomDetailsModel");
                this._populateUniqueFilterValues(this._originalRoomdata);
                sap.ui.core.BusyIndicator.hide();
            })
        },
        RD_onSearch: function () {
            var oView = this.getView();

            var oFilterBar = oView.byId("RD_id_FilterbarEmployee");

            var oTable = oView.byId("id_ARD_Table");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("RD_id_CustomerName1").getSelectedKey() || oView.byId("RD_id_CustomerName1").getValue();
            var sCustomerID = oView.byId("RD_id_CompanyName1").getSelectedKey() || oView.byId("RD_id_CompanyName1").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("RoomNo", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }

            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("BedTypeName", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(oCombinedFilter);
        },
        RD_onPressClear: function () {
            this.getView().byId("RD_id_CustomerName1").setSelectedKey("")
            this.getView().byId("RD_id_CompanyName1").setSelectedKey("")
        },
        onRoomNoInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },

        onPriceInputLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();
            let sValue = oInput.getValue();

            // Remove any non-digit characters
            sValue = sValue.replace(/[^0-9]/g, "");

            oInput.setValue(sValue);
        },

        onACtypeChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },
        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
    });
});