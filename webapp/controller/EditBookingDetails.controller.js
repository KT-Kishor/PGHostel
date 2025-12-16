sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation",
    "../model/formatter"
], function(BaseController, JSONModel, MessageToast, MessageBox, validation, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.EditBookingDetails", {
        Formatter: Formatter,

        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("EditBookingDetails").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function() {
            var oViewModel = new JSONModel({
                editMode: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            this.BedTypedetails()
            this.Facilitidetails()
        },

        BedTypedetails: async function() {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_BedType", {});
                const aBedTypes = Array.isArray(oData.data) ?
                    oData.data :
                    [oData.data];

                const oBedTypeModel = new JSONModel(aBedTypes);
                this.getView().setModel(oBedTypeModel, "BedTypeModel");

            } catch (err) {
                console.error("Error while fetching Bed Type details:", err);
            }
        },
        
        Facilitidetails: async function() {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {});
                const aBedTypes = Array.isArray(oData.data) ?
                    oData.data :
                    [oData.data];

                const oBedTypeModel = new JSONModel(aBedTypes);
                this.getView().setModel(oBedTypeModel, "ExtraFacilitiModel");

            } catch (err) {
                console.error("Error while fetching Bed Type details:", err);
            }
        },
        
        onPressEditSave: async function(oEvent) {
            var oButton = oEvent.getSource();
            var oViewModel = this.getView().getModel("viewModel");
            var bEditMode = oViewModel.getProperty("/editMode");
            var oHostelModel = this.getView().getModel("HostelModel");
            var oData = oHostelModel.getData();

            if (!bEditMode) {
                // Before entering edit mode, ensure bed types are loaded
                await this.BedTypedetails();

                // Switch to edit mode
                oViewModel.setProperty("/editMode", true);
                oButton.setText("Save");
            } else {

                oViewModel.setProperty("/editMode", false);
                oButton.setText("Edit");

                try {
                    //  Build Booking data
                    const bookingData = [{
                        BookingDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                        RentPrice: oData.GrandTotal ? oData.GrandTotal.toString() : "0",
                        RoomPrice: oData.RoomPrice || "0",
                        NoOfPersons: oData.noofperson || 1,
                        Customerid: oData.CustomerId,
                        StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                        EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                        Status: "Updated",
                        PaymentType: oData.PaymentType || "",
                        BedType: oData.BedType || ""
                    }];

                    //  Build Facility data
                    const facilityData = [];
                    if (oData.AllSelectedFacilities && oData.AllSelectedFacilities.length > 0) {
                        oData.AllSelectedFacilities.forEach(fac => {
                            facilityData.push({
                                PaymentID: "",
                                FacilityName: fac.FacilityName,
                                FacilitiPrice: fac.Price,
                                StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                                EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                                PaidStatus: "Pending"
                            });
                        });
                    }

                    //  Build Payment data (optional)
                    // const paymentDetails = {
                    //     BankName: sap.ui.getCore().byId("idBankName")?.getValue() || "",
                    //     Amount: sap.ui.getCore().byId("idAmount")?.getValue() || oData.GrandTotal,
                    //     PaymentType: oData.PaymentType || "",
                    //     BankTransactionID: sap.ui.getCore().byId("idTransactionID")?.getValue() || "",
                    //     Date: sap.ui.getCore().byId("idPaymentDate")?.getValue() || "",
                    //     Currency: sap.ui.getCore().byId("idCurrency")?.getValue() || "INR"
                    // };

                    //  Build Personal Information
                    const personData = [{
                        Salutation: oData.Salutation || "",
                        CustomerName: oData.FullName || "",
                        UserID: oData.UserID || "",
                        CustomerID: oData.CustomerID || "",
                        STDCode: oData.STDCode || "",
                        MobileNo: oData.MobileNo || "",
                        Gender: oData.Gender || "",
                        DateOfBirth: oData.DateOfBirth ? oData.DateOfBirth.split("/").reverse().join("-") : "",
                        CustomerEmail: oData.CustomerEmail || "",
                        Country: oData.Country || "",
                        State: oData.State || "",
                        City: oData.City || "",
                        PermanentAddress: oData.Address || "",
                        Booking: bookingData,
                        FacilityItems: facilityData,
                        //  PaymentDetails: [paymentDetails]
                    }];

                    //  Final payload structure
                    const oPayload = personData;
                    var custid = bookingData[0].Customerid
                    // --- AJAX CALL (Update to backend) ---
                    await this.ajaxUpdateWithJQuery("HM_Customer", {
                        data: oPayload,
                        filters: {
                            CustomerID: custid
                        }
                    });
                    sap.m.MessageToast.show("Booking details updated successfully!");

                } catch (err) {
                    console.error("Error during update:", err);
                    sap.m.MessageBox.error("Failed to update booking details: " + err.message);
                }
            }
        },

        onPressCancelBooking: async function(oEvent) {
            var oButton = oEvent.getSource();
            var oViewModel = this.getView().getModel("viewModel")
            var oHostelModel = this.getView().getModel("HostelModel");
            var oData = oHostelModel.getData();

            var that = this;
            sap.m.MessageBox.confirm(
                "Are you sure you want to cancel this booking?", {
                    title: "Confirm Cancellation",
                    icon: sap.m.MessageBox.Icon.WARNING,
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: async function(oAction) {
                        if (oAction !== sap.m.MessageBox.Action.YES) {
                            return; // Stop if user presses NO
                        }

                        // EXIT EDIT MODE
                        oViewModel.setProperty("/editMode", false);
                        oButton.setText("Cancel");

                        try {
                            var today = new Date();
                            var sCancelDate = today.toISOString().split("T")[0]; // YYYY-MM-DD
                            const bookingData = [{
                                BookingDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                                RentPrice: oData.GrandTotal ? oData.GrandTotal.toString() : "0",
                                RoomPrice: oData.RoomPrice || "0",
                                NoOfPersons: oData.noofperson || 1,
                                Customerid: oData.CustomerId,
                                StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                                EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                                Status: "Cancelled",
                                CancelDate: sCancelDate,
                                PaymentType: oData.PaymentType || "",
                                BedType: oData.BedType || ""
                            }];


                            const facilityData = [];
                            if (oData.AllSelectedFacilities?.length > 0) {
                                oData.AllSelectedFacilities.forEach(fac => {
                                    facilityData.push({
                                        PaymentID: "",
                                        FacilityName: fac.FacilityName,
                                        FacilitiPrice: fac.Price,
                                        StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                                        EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                                        PaidStatus: "Pending"
                                    });
                                });
                            }

                            const personData = [{
                                Salutation: oData.Salutation || "",
                                CustomerName: oData.FullName || "",
                                UserID: oData.UserID || "",
                                CustomerID: oData.CustomerID || "",
                                STDCode: oData.STDCode || "",
                                MobileNo: oData.MobileNo || "",
                                Gender: oData.Gender || "",
                                DateOfBirth: oData.DateOfBirth ? oData.DateOfBirth.split("/").reverse().join("-") : "",
                                CustomerEmail: oData.CustomerEmail || "",
                                Country: oData.Country || "",
                                State: oData.State || "",
                                City: oData.City || "",
                                PermanentAddress: oData.Address || "",
                                Booking: bookingData,
                                FacilityItems: facilityData
                            }];

                            sap.ui.core.BusyIndicator.show(0);
                            var custid = bookingData[0].Customerid; -
                            await that.ajaxUpdateWithJQuery("HM_Customer", {
                                data: personData,
                                filters: {
                                    CustomerID: custid
                                }
                            });

                            sap.m.MessageToast.show("Booking cancelled successfully!");
                            var oEditButton = that.byId("idEditBtn");
                            if (oEditButton) {
                                oEditButton.setVisible(false);
                            }

                            var oAddfacilityButton = that.byId("id_addfacility");
                            if (oAddfacilityButton) {
                                oAddfacilityButton.setVisible(false);
                            }

                            var oEditFacilityButton = that.byId("id_editfacility");
                            if (oEditFacilityButton) {
                                oEditFacilityButton.setVisible(false);
                            }

                        } catch (err) {
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show(err.message || err.responseText);
                        } finally {
                            sap.ui.core.BusyIndicator.hide();
                        }
                    },
                }
            );
        },

        onSelectionChange: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;

            var sSelectedBedTypeID = oSelectedItem.getKey();

            var oBedTypeModel = this.getView().getModel("BedTypeModel");
            var aBedTypes = oBedTypeModel.getData();

            // Find selected bed type object
            var oSelectedBedType = aBedTypes.find(function(item) {
                return item.BedTypeID === sSelectedBedTypeID;
            });

            if (oSelectedBedType) {
                var oHostelModel = this.getView().getModel("HostelModel");

                // Update both RoomType and RoomPrice
                oHostelModel.setProperty("/RoomType", oSelectedBedType.BedTypeName);
                oHostelModel.setProperty("/RoomPrice", oSelectedBedType.Price);

                sap.m.MessageToast.show("Room Type changed to " + oSelectedBedType.BedTypeName);
            }
        },

        onEditFacilityDetails: async function() {
            const oTable = this.byId("idFacilityRoomTableDetails");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a facility to edit.");
                return;
            }

            // Get the selected facility data
            const oContext = oSelectedItem.getBindingContext("HostelModel");
            const oSelectedFacility = oContext.getObject();

            // Create a local model for editing
            const oEditModel = new sap.ui.model.json.JSONModel(Object.assign({}, oSelectedFacility));
            this.getView().setModel(oEditModel, "edit");


            if (!this._pEditFacilityDialog) {
                this._pEditFacilityDialog = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.FacilitiTableUpdate",
                    this
                );
                this.getView().addDependent(this._pEditFacilityDialog);
            }
            this._pEditFacilityDialog.open();
        },

        onEditDialogClose: function() {
            var oView = this.getView()
            const oTable = oView.byId("idFacilityRoomTableDetails");
            if (oTable) {
                oTable.removeSelections();
            }
            this._pEditFacilityDialog.close();
        },

        onEditDateChange: function() {
            const oModel = this.getView().getModel("edit");
            const sStart = oModel.getProperty("/StartDate");
            const sEnd = oModel.getProperty("/EndDate");

            if (sStart && sEnd) {
                const startDate = new Date(sStart);
                const endDate = new Date(sEnd);
                const diffTime = endDate - startDate;
                const days = diffTime >= 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 : 0;
                oModel.setProperty("/TotalDays", days);
            }
        },

        onEditFacilitySave: function() {
            const oEditModel = this.getView().getModel("edit");
            const oUpdatedData = oEditModel.getData();

            const oHostelModel = this.getView().getModel("HostelModel");
            const aFacilities = oHostelModel.getProperty("/AllSelectedFacilities");

            // Find and replace the updated row
            const iIndex = aFacilities.findIndex(f => f.FacilityName === oUpdatedData.FacilityName);
            if (iIndex !== -1) {
                aFacilities[iIndex] = oUpdatedData;
                oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);
            }

            // Recalculate total facility cost
            let total = 0;
            aFacilities.forEach(f => {
                total += parseFloat(f.Price) * parseInt(f.TotalDays || 0);
            });

            oHostelModel.setProperty("/TotalFacilityPrice", total);
            oHostelModel.setProperty("/GrandTotal", total + parseFloat(oHostelModel.getProperty("/RoomPrice") || 0));

            sap.m.MessageToast.show("Facility details updated successfully!");
            this._pEditFacilityDialog.close();
        },

        onPressAddFaciliti: function() {
            if (!this._pAddFacilityDialog) {
                this._pAddFacilityDialog = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.AddFaciliti",
                    this
                );
                this.getView().addDependent(this._pAddFacilityDialog);
            }
            this._pAddFacilityDialog.open();
        },

        onFacilitiSelectionChange: function(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;

            const sKey = oSelectedItem.getKey();

            // Get all facilities
            const oModel = this.getView().getModel("ExtraFacilitiModel");
            const aFacilities = oModel.getData();

            // Find the selected facility
            const oSelectedFacility = aFacilities.find(f => f.ID === sKey);

            if (oSelectedFacility) {
                //  Access Input safely using byId()
                sap.ui.getCore().byId("idFacilityPrice").setValue(oSelectedFacility.Price);
            }
        },

        onFacilityDateChange: function() {
            const sStart = sap.ui.getCore().byId("idFacilityStartDate").getValue();
            const sEnd = sap.ui.getCore().byId("idFacilityEndDate").getValue();

            if (sStart && sEnd) {
                const startDate = new Date(sStart);
                const endDate = new Date(sEnd);
                if (endDate >= startDate) {
                    const diff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                    sap.ui.getCore().byId("idFacilityDays").setValue(diff);
                } else {
                    sap.m.MessageToast.show("End Date must be after Start Date");
                    sap.ui.getCore().byId("idFacilityDays").setValue("");
                }
            }
        },
        
        onAddFacilitySave: function() {
            const oCombo = sap.ui.getCore().byId("idFacilityCombo")
            const oPrice = sap.ui.getCore().byId("idFacilityPrice")
            const oStart = sap.ui.getCore().byId("idFacilityStartDate")
            const oEnd = sap.ui.getCore().byId("idFacilityEndDate")
            const oDays = sap.ui.getCore().byId("idFacilityDays")

            const sFacilityName = oCombo.getSelectedItem()?.getText();
            const sPrice = parseFloat(oPrice.getValue() || 0);
            const sStartDate = oStart.getValue();
            const sEndDate = oEnd.getValue();
            const iDays = parseInt(oDays.getValue() || 0);

            //  if (!sFacilityName || !sPrice || !sStartDate || !sEndDate) {
            //      sap.m.MessageToast.show("Please fill all required fields.");
            //      return;
            //  }

            const oHostelModel = this.getView().getModel("HostelModel");
            const aFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];

            // Push new row
            aFacilities.push({
                FacilityName: sFacilityName,
                Price: sPrice,
                StartDate: sStartDate,
                EndDate: sEndDate,
                TotalDays: iDays
            });

            // Update model
            oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);

            // Recalculate totals
            let total = 0;
            aFacilities.forEach(f => {
                total += f.Price * (f.TotalDays || 1);
            });

            oHostelModel.setProperty("/TotalFacilityPrice", total);
            oHostelModel.setProperty("/GrandTotal", total + parseFloat(oHostelModel.getProperty("/RoomPrice") || 0));

            sap.m.MessageToast.show("Facility added successfully!");

            this._pAddFacilityDialog.close();
        },

       onNavBack: function () {
        const oUIModel = this.getOwnerComponent().getModel("UIModel");
        oUIModel.setProperty("/isLoggedIn", true);
    this.getOwnerComponent().getRouter().navTo("RouteHostel");
}


    })
})