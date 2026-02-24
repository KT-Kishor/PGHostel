sap.ui.define([
    "./BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "../model/formatter",
    "../utils/validation",
], function (BaseController, Controller, MessageToast, JSONModel, Fragment, MessageBox, Formatter, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.ManageProfile", {
        Formatter: Formatter,
        onInit: function () {
            const oView = this.getView();

            // Login form model
            oView.setModel(new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: ""
            }), "LoginMode");

            // Edit / Save state model
            oView.setModel(new JSONModel({
                isEditMode: false
            }), "saveModel");

            // Logged-in user
            const oUserModel = sap.ui.getCore().getModel("LoginModel");
            this._oLoggedInUser = oUserModel ? oUserModel.getData() : {};

            this.getView().setModel(new JSONModel({
                ComplaintID: "",
                ComplaintType: "",
                RoomNo: "",
                Description: "",
                FileName: "",
                FileType: "",
                FileContent: "",
                Documents: []
            }), "complaintTemp");

            // Router matched
            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteManageProfile")
                .attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            this.ManageData();
            this.commonLoginFunction()
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

        },

        ManageData: async function () {
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
                fullUserData = oUser;
                const oTempModel = new JSONModel({
                    bookings: [],
                    Payments: [],
                    isEditMode: false,
                    selectedTab: "Booking History",
                    isTableBusy: true
                });

                this.getView().setModel(oTempModel, "profileData");
                this.byId("id_tabBar1").setSelectedKey("Booking History");

                const filter = { UserID: sUserID }
                const response = await this.ajaxReadWithJQuery("CustomerAndPayment", filter);
                const aBookings = response?.BookingData || [];
                const aPayments = response?.PaymentData || [];
                const aComplain = response?.ComplaintData || [];

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
                    let GSTValue = 0;
                    if (booking.GSTType === "IGST") {
                        GSTValue = Number(booking.GSTValue) / 100 || 0;
                    } else {
                        GSTValue = (Number(booking.GSTValue) + Number(booking.GSTValue)) / 100 || 0;
                    }

                    return {
                        bookingGroup: bookingGroup,
                        customerName: booking.Salutation + " " + booking.CustomerName,
                        room: booking.BedType || "",
                        Startdate: new Date(booking.StartDate).toLocaleDateString("en-GB"),
                        EndDate: booking.EndDate ? new Date(booking.EndDate).toLocaleDateString("en-GB") : "",
                        BookingDate: booking.BookingDate ? new Date(booking.BookingDate).toLocaleDateString("en-GB") : "",
                        amount: (
                            (Number(booking.TotalRoomprice || 0) + Number(booking.FacilityPrice || 0)) +
                            ((Number(booking.TotalRoomprice || 0) + Number(booking.FacilityPrice || 0)) * GSTValue) - Number(booking.Discount || 0)
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
                const aComplainData = aComplain.map(complain => ({
                    ComplaintID: complain.ComplaintID,
                    ComplaintType: complain.ComplaintType,
                    Description: complain.Description,
                    ComplaintDescription: complain.Description,
                    ComplaintRaisedDate: complain.ComplaintRaisedDate,
                    ComplaintStatus: complain.Status,
                    RoomNo: complain.RoomNo || "",
                    FileName: complain.FileName || "",
                    FileType: complain.FileType || "",
                    File: complain.File || ""
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
                    complain: aComplainData,
                    bookingCount: aBookingData.length,
                    paymentCount: aPaymentData.length,
                    complainCount: aComplainData.length,
                    selectedTab: "Booking History",
                    aCustomers: aBookingData.map(booking => ({ customerID: booking.customerID || CustomerID, customerName: booking.customerName })),
                    facility: [],
                    isTableBusy: false
                });
                this.getView().setModel(oProfileModel, "profileData");
                this._applyCountryStateCityFilters();
                oProfileModel.setProperty("/isEditMode", false);
                oProfileModel.setProperty("/isTableBusy", false);

            } catch (err) {
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
                this.getView().setModel(oProfileModel, "profileData");
                this._applyCountryStateCityFilters();
                oProfileModel.setProperty("/isEditMode", false);


            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _applyCountryStateCityFilters: function () {

            const oModel = this.getView().getModel("profileData");
            if (!oModel) return;

            const oCountryCB = this.byId("id_country1");
            const oStateCB = this.byId("id_state1");
            const oSourceCB = this.byId("id_city1");

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
        onNavBack: function () {
            const oUser = this._oLoggedInUser;
            const oUIModel = this.getOwnerComponent().getModel("UIModel");

            if (oUser && oUser.UserID) {
                oUIModel.setProperty("/isLoggedIn", true);
            } else {
                oUIModel.setProperty("/isLoggedIn", false);
            }
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteHostel");
        },
        onPreviewProfilePhoto: function () {
            const sPhoto = this.getView().getModel("profileData").getProperty("/photo");
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
        onPressAvatarEdit: function (oEvent) {
            this._oAvatarActionSheet = new sap.m.ActionSheet({
                buttons: [
                    new sap.m.Button({
                        text: "Take Photo",
                        icon: "sap-icon://add-photo",
                        press: this.onTakePhoto.bind(this)
                    }),
                    new sap.m.Button({
                        text: "Upload from Gallery",
                        icon: "sap-icon://image-viewer",
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
        onUploadPhoto: function () {
            const uploader = this.byId("id_fileUploaderAvatar1");
            if (!uploader) return;

            setTimeout(() => {
                const oInput = uploader.getFocusDomRef();
                if (!oInput) return;

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

                const oModel = this.getView().getModel("profileData");
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
            const oModel = this.getView().getModel("profileData");
            const initials = oModel.getProperty("/initials");

            oModel.setProperty("/photo", "");
            oModel.setProperty("/initials", initials);
            await this.updateUserPhoto({
                fileName: "",
                fileType: "",
                fileContent: ""
            });
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

            var oModel = this.getView().getModel("profileData");
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
        onUserlivechange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },
        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
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
        onEditSaveProfile: async function () {
            const oModel = this.getView().getModel("profileData");
            var data = oModel.getData()
            const isEditMode = oModel.getProperty("/isEditMode");
            if (!isEditMode) {
                oModel.setProperty("/isEditMode", true);
                oModel.setProperty("/Country", data.Country);

                sap.ui.core.BusyIndicator.show(0);

                sap.ui.core.BusyIndicator.hide();

                return;
            }
            const isMandatoryValid = (
                utils._LCvalidateMandatoryField(this.byId("id_Name1"), "ID") &&
                utils._LCvalidateEmail(this.byId("id_mail1"), "ID") &&
                this.onChangeDOB(this.byId("id_dob1"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("id_country1"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("id_state1"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("id_city1"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("id_phone1"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("id_gender1"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("id_address1"), "ID")
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandatoryFieldsAreMandatory"));
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
                MessageToast.show(this.i18nModel.getText("profileUpdatedSuccessfully"));

            } catch (err) {
                console.error(err);
                MessageToast.show(this.i18nModel.getText("errorUpdatingProfile"));
            } finally {
                sap.ui.core.BusyIndicator.hide();
                oModel.setProperty("/isEditMode", false);
                oModel.refresh(true);

            }
        },
        onPressBookingRow: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("profileData");
            var oBookingData = oContext.getObject();

            // Now reuse your logic exactly as in onEditBooking
            var oProfileModel = this.getView().getModel("profileData");
            var aCustomers = oProfileModel.getProperty("/aCustomers");
            var aFacilities = oProfileModel.getProperty("/facility");

            var sCustomerID = oBookingData.customerID || oBookingData.CustomerID || "";

            if (!sCustomerID) {
                MessageToast.show(this.i18nModel.getText("customerIDnotfoundforthisBooking"));
                return;
            }

            var oCustomer = aCustomers.find(cust => cust.customerID === sCustomerID);
            if (!oCustomer) {
                MessageToast.show(this.i18nModel.getText("noCustomerDetailsfoundforthisBooking"));
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
                sPath: btoa(encodeURIComponent(sCustomerID)),
                from: "ManageProfile"
            });
        },
        onPressManageInvoice: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("profileData").getObject().InvNo), dash: "Customerinvoice" });
        },
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
        onTableUpdateFinished: function () {
            this._updateRowCount();
        },

        _updateRowCount: function () {
            const oProfileModel = this.getView().getModel("profileData");
            const sSelectedTab = oProfileModel.getProperty("/selectedTab");
            let oTable;

            if (sSelectedTab === "Payment") {
                oTable = this.byId("Id_PaymentTable1");
            } else if (sSelectedTab === "Booking History") {
                oTable = this.byId("Id_ProfileaTable1");
            } else if (sSelectedTab === "Complaints") {
                oTable = this.byId("Id_CompmaintTable");
            }


            const oBinding = oTable.getBinding("items");
            const length = oBinding ? oBinding.getLength() : 0;

            if (sSelectedTab === "Payment") {
                oProfileModel.setProperty("/paymentCount", length);
            } else if (sSelectedTab === "Booking History") {
                oProfileModel.setProperty("/bookingCount", length);
            } else if (sSelectedTab === "Complaints") {
                oProfileModel.setProperty("/complainCount", length);
            }
        },

        onTableSelect: async function (oEvent) {
            const sKey = oEvent.getParameter("key");
            const oModel = this.getView().getModel("profileData");
            oModel.setProperty("/selectedTab", sKey);
        },
        onlogout: function () {

            this.getView().getModel("profileData").setData({});
            const oLoginModel = this.getOwnerComponent().getModel("LoginModel");

            if (oLoginModel) {
                oLoginModel.setProperty("/EmployeeID", "");
                // oLoginModel.setProperty("/UserID", "");
                oLoginModel.setProperty("/UserName", "");
                oLoginModel.setProperty("/EmployeeName", "");
                oLoginModel.setProperty("/EmailID", "");
            }

            // Reset Login State
            this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", false);
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
            MessageToast.show(this.i18nModel.getText("logoutSuccessful"));
        },
        onGlobalSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("newValue")?.toLowerCase() || "";

            const oProfileModel = this.getView().getModel("profileData");
            const sSelectedTab = oProfileModel.getProperty("/selectedTab");

            // Decide Table
            const oTable = sSelectedTab === "Payment" ? this.byId("Id_PaymentTable1") : this.byId("Id_ProfileaTable1");
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
                } else if (sSelectedTab === "Booking History") {
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
                else if (sSelectedTab === "Complaints") {

                }
            }
            oBinding.filter(aFilters);
            this._updateRowCount();
        },
        onCountrySelectionChange: function (oEvent) {
            const oCountry = oEvent.getSource();
            const oModel = this.getView().getModel("profileData");

            utils._LCvalidateMandatoryField(oEvent);

            const oStateCB = this.byId("id_state1");
            const oCityCB = this.byId("id_city1");
            const oSTD = this.byId("id_std1");
            const oMobile = this.byId("id_phone1");

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
        CC_onChangeState: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);

            const oModel = this.getView().getModel("profileData");
            const oItem = oEvent.getSource().getSelectedItem();

            const oCityCB = this.byId("id_city1");
            const oCountryCB = this.byId("id_country1");

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

            const oModel = this.getView().getModel("profileData");
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
        },
        _onProfileSTDChange: function () {
            const oSTD = this.byId("id_std1");
            const oMobile = this.byId("id_phone1");

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

            const stdRaw = this.byId("id_std1").getValue() || "";
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
        onPressRaiseComplaint: function () {
            this._openComplaintDialog(); // no data → create mode
        },

        _openComplaintDialog: function (oComplaintData) {
            const oView = this.getView();
            const oTempModel = oView.getModel("complaintTemp");

            if (oComplaintData) {
                // Get raw file data – could be byte array, Buffer object, or base64 string
                let rawFile = oComplaintData.File || oComplaintData.FileContent || "";
                let base64File = "";
                let fileSize = 0;

                if (rawFile) {
                    // Handle Buffer-like object: { type: "Buffer", data: [...] }
                    if (typeof rawFile === "object" && rawFile.data && Array.isArray(rawFile.data)) {
                        rawFile = rawFile.data;
                    }

                    if (Array.isArray(rawFile)) {
                        // Convert byte array to base64
                        const byteArray = new Uint8Array(rawFile);
                        fileSize = byteArray.length; // exact size in bytes

                        // Build binary string
                        let binary = "";
                        for (let i = 0; i < byteArray.length; i++) {
                            binary += String.fromCharCode(byteArray[i]);
                        }
                        base64File = btoa(binary);
                    } else if (typeof rawFile === "string" && rawFile) {
                        // Already a base64 string (from new upload)
                        base64File = rawFile;
                        fileSize = Math.ceil(rawFile.length * 0.75); // approximate
                    }
                }

                const sExistingFileName = oComplaintData.FileName || "";
                const sExistingFileType = oComplaintData.FileType || "";

                const aDocuments = sExistingFileName
                    ? [
                        {
                            FileName: sExistingFileName,
                            DocumentType: sExistingFileType,
                            FileType: sExistingFileType,
                            File: base64File,      // proper base64 for preview
                            Base64: base64File,
                            size: fileSize,
                            // DocType: "Attachment"
                        }
                    ]
                    : [];

                oTempModel.setData({
                    ComplaintID: oComplaintData.ComplaintID,
                    ComplaintType: oComplaintData.ComplaintType,
                    RoomNo: oComplaintData.RoomNo || "",
                    Description: oComplaintData.Description || oComplaintData.ComplaintDescription || "",
                    FileName: sExistingFileName,
                    FileType: sExistingFileType,
                    FileContent: base64File, // store for saving
                    Documents: aDocuments
                });
            } else {
                // New complaint: reset model
                oTempModel.setData({
                    ComplaintID: "",
                    ComplaintType: "",
                    RoomNo: "",
                    Description: "",
                    FileName: "",
                    FileType: "",
                    FileContent: "",
                    Documents: []
                });
            }

            // Open dialog (your existing logic)
            if (!this._oComplaintDialog) {
                Fragment.load({
                    name: "sap.ui.com.project1.fragment.Complaint",
                    controller: this
                }).then(function (oDialog) {
                    this._oComplaintDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                    this._resetComplaintValidationStates();
                }.bind(this));
            } else {
                this._oComplaintDialog.open();
                this._resetComplaintValidationStates();
            }
        },

        onCloseComplaintDialog: function () {
            if (this._oComplaintDialog) {
                this._oComplaintDialog.close();
            }
            if (this._oComplaintPreviewDialog) {
                this._oComplaintPreviewDialog.close();
            }
            if (this._oComplaintPreviewUrl) {
                URL.revokeObjectURL(this._oComplaintPreviewUrl);
                this._oComplaintPreviewUrl = null;
            }
            this._oComplaintDialog.destroy();
            this._oComplaintDialog = null;
        },
        _getComplaintControl: function (sId) {
            return sap.ui.getCore().byId(sId) || this.byId(sId);
        },
        _resetComplaintValidationStates: function () {
            const aControls = [
                this._getComplaintControl("idComplaintType"),
                this._getComplaintControl("idComplaintRoom"),
                this._getComplaintControl("idComplaintDesc")
            ];
            aControls.forEach(function (oControl) {
                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            });
        },
        onComplaintTypeChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },
        onComplaintRoomLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sSanitized = (oInput.getValue() || "")
                .toUpperCase()
                .replace(/[^A-Z0-9-]/g, "");
            if (oInput.getValue() !== sSanitized) {
                oInput.setValue(sSanitized);
            }
            utils._LCvalidateMandatoryField(oInput, "ID");
        },
        onComplaintRoomChange: function (oEvent) {
            const oInput = oEvent.getSource();
            oInput.setValue((oInput.getValue() || "").trim().toUpperCase());
            utils._LCvalidateMandatoryField(oInput, "ID");
        },
        onComplaintDescLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        onComplaintFileChange: function (oEvent) {
            const oUploader = oEvent.getSource();
            const file = oEvent.getParameter("files")[0];
            if (!file) {
                return;
            }

            const aAllowedMimeTypes = [
                "image/jpeg",
                "image/jpg",
                "image/png"
            ];
            if (file.type && !aAllowedMimeTypes.includes(file.type)) {
                MessageToast.show("Only JPG & PNG files are allowed.");
                oUploader.clear();
                return;
            }

            const MAX_SIZE = 2 * 1024 * 1024;
            if (file.size > MAX_SIZE) {
                MessageToast.show("File size must be less than 2 MB.");
                oUploader.clear();
                return;
            }

            const oTempModel = this.getView().getModel("complaintTemp");
            const aDocuments = oTempModel.getProperty("/Documents") || [];
            const oExistingDoc = aDocuments[0];
            if (
                oExistingDoc &&
                oExistingDoc.FileName === file.name &&
                Number(oExistingDoc.size || 0) === Number(file.size || 0)
            ) {
                MessageToast.show(this.i18nModel.getText("thisfilealreadyuploaded"));
                oUploader.clear();
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const sResult = e.target.result || "";
                const base64 = sResult.includes(",") ? sResult.split(",")[1] : sResult;

                const oDoc = {
                    FileName: file.name,
                    DocumentType: file.type,
                    FileType: file.type,
                    File: base64,
                    Base64: base64,
                    size: file.size,
                    // DocType: "Attachment"
                };

                oTempModel.setProperty("/Documents", [oDoc]);
                oTempModel.setProperty("/FileName", file.name);
                oTempModel.setProperty("/FileType", file.type);
                oTempModel.setProperty("/FileContent", base64);
                oUploader.clear();
            };
            reader.readAsDataURL(file);
        },
        onComplaintDeleteDoc: function () {
            const oTempModel = this.getView().getModel("complaintTemp");
            oTempModel.setProperty("/Documents", []);
            oTempModel.setProperty("/FileName", "");
            oTempModel.setProperty("/FileType", "");
            oTempModel.setProperty("/FileContent", "");

            const oUploader = sap.ui.getCore().byId("idComplaintFileUploader");
            if (oUploader) {
                oUploader.clear();
            }
        },
        // onComplaintPreviewDoc: function (oEvent) {
        //     const autoDecodeBase64 = function (sBase64) {
        //         if (!sBase64 || typeof sBase64 !== "string") {
        //             return "";
        //         }
        //         let sDecoded = sBase64.replace(/\s/g, "");
        //         let sLast = sDecoded;
        //         for (let i = 0; i < 5; i++) {
        //             try {
        //                 if (
        //                     sLast.startsWith("iVB") ||
        //                     sLast.startsWith("/9j")
        //                 ) {
        //                     return sLast;
        //                 }
        //                 sLast = atob(sLast);
        //             } catch (e) {
        //                 break;
        //             }
        //         }
        //         return sLast;
        //     };

        //     const oDoc = oEvent.getSource().getBindingContext("complaintTemp")?.getObject();
        //     if (!oDoc || !(oDoc.File || oDoc.Base64)) {
        //         MessageToast.show("No document to preview.");
        //         return;
        //     }

        //     const sBase64 = autoDecodeBase64(oDoc.File || oDoc.Base64);
        //     let sMimeType = oDoc.DocumentType || oDoc.FileType || "application/octet-stream";
        //     if (!oDoc.DocumentType && !oDoc.FileType) {
        //         if (sBase64.startsWith("iVB")) sMimeType = "image/png";
        //         else if (sBase64.startsWith("/9j")) sMimeType = "image/jpeg";
        //     }

        //     if (sMimeType.startsWith("image/")) {
        //         const sImageSrc = `data:${sMimeType};base64,${sBase64}`;
        //         this._oComplaintPreviewDialog = new sap.m.Dialog({
        //             title: oDoc.FileName || "Document Preview",
        //             contentWidth: "50%",
        //             contentHeight: "60%",
        //             draggable: true,
        //             resizable: true,
        //             horizontalScrolling: false,
        //             verticalScrolling: true,
        //             content: [
        //                 new sap.m.Image({
        //                     src: sImageSrc,
        //                     width: "100%",
        //                     height: "100%",
        //                     densityAware: false
        //                 })
        //             ],
        //             beginButton: new sap.m.Button({
        //                 text: "Close",
        //                 press: () => this._oComplaintPreviewDialog.close()
        //             }),
        //             afterClose: () => {
        //                 this._oComplaintPreviewDialog.destroy();
        //                 this._oComplaintPreviewDialog = null;
        //             }
        //         });
        //         this.getView().addDependent(this._oComplaintPreviewDialog);
        //         this._oComplaintPreviewDialog.open();
        //         return;
        //     }

        //     MessageToast.show("Preview not supported for this file type.");
        // },
        onComplaintPreviewDoc: function (oEvent) {
            const autoDecodeBase64 = function (sBase64) {
                if (!sBase64 || typeof sBase64 !== "string") {
                    return "";
                }
                let sDecoded = sBase64.replace(/\s/g, "");
                let sLast = sDecoded;
                for (let i = 0; i < 5; i++) {
                    try {
                        if (
                            sLast.startsWith("iVB") ||
                            sLast.startsWith("/9j")
                        ) {
                            return sLast;
                        }
                        sLast = atob(sLast);
                    } catch (e) {
                        break;
                    }
                }
                return sLast;
            };

            const oDoc = oEvent.getSource().getBindingContext("complaintTemp")?.getObject();
            if (!oDoc || !(oDoc.File || oDoc.Base64)) {
                MessageToast.show("No document to preview.");
                return;
            }

            const sBase64 = autoDecodeBase64(oDoc.File || oDoc.Base64);
            let sMimeType = oDoc.DocumentType || oDoc.FileType || "application/octet-stream";
            if (!oDoc.DocumentType && !oDoc.FileType) {
                if (sBase64.startsWith("iVB")) sMimeType = "image/png";
                else if (sBase64.startsWith("/9j")) sMimeType = "image/jpeg";
            }

            if (sMimeType.startsWith("image/")) {
                const sImageSrc = `data:${sMimeType};base64,${sBase64}`;

                // Create FlexBox container for proper image centering
                const oFlex = new sap.m.FlexBox({
                    width: "100%",
                    height: "100%",
                    renderType: "Div",
                    justifyContent: "Center",
                    alignItems: "Center",
                    items: [
                        new sap.m.Image({
                            id: this.createId("complaintPreviewImage"),
                            densityAware: false,
                            width: "100%",
                            height: "100%",
                            style: "object-fit: contain; display:block;"
                        })
                    ]
                });

                this._oComplaintPreviewDialog = new sap.m.Dialog({
                    title: oDoc.FileName || "Document Preview",
                    contentWidth: "50%",
                    contentHeight: "60%",
                    draggable: true,
                    resizable: true,
                    contentPadding: "0rem",
                    horizontalScrolling: false,
                    verticalScrolling: false, // Changed to false to remove scrollbar
                    content: [oFlex],
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: () => this._oComplaintPreviewDialog.close()
                    }),
                    afterClose: () => {
                        this._oComplaintPreviewDialog.destroy();
                        this._oComplaintPreviewDialog = null;
                    }
                });

                this.getView().addDependent(this._oComplaintPreviewDialog);

                // Set the image source
                this.byId("complaintPreviewImage").setSrc(sImageSrc);
                this._oComplaintPreviewDialog.open();
                return;
            }

            MessageToast.show("Preview not supported for this file type.");
        },
        onSaveComplaint: async function () {
            const oView = this.getView();
            const oTempModel = oView.getModel("complaintTemp");
            const oData = oTempModel.getData();

            const oComplaintType = this._getComplaintControl("idComplaintType");
            const oRoomNo = this._getComplaintControl("idComplaintRoom");
            const oDescription = this._getComplaintControl("idComplaintDesc");

            if (!utils._LCvalidateMandatoryField(oComplaintType, "ID")) {
                MessageToast.show("Please fill all required fields.");
                return;
            }
            if (!utils._LCvalidateMandatoryField(oRoomNo, "ID")) {
                MessageToast.show("Please fill all required fields.");
                return;
            }
            if (!utils._LCvalidateMandatoryField(oDescription, "ID")) {
                MessageToast.show("Please fill all required fields.");
                return;
            }

            const sUserID = this._oLoggedInUser.UserID;
            const sUserName = this._oLoggedInUser.UserName; // RaisedBy
            const sBranchCode = this._oLoggedInUser.BranchCode; // direct from user

            const sToday = new Date().toISOString().split("T")[0];

            const sComplaintType = oComplaintType.getValue();

            const payloadData = {
                UserID: sUserID,
                RaisedBy: sUserName,
                ComplaintType: sComplaintType,
                Description: oData.Description,
                Status: "Pending",
                ComplaintRaisedDate: sToday,
                RoomNo: oData.RoomNo,
                FileName: oData.FileName || "",
                FileType: oData.FileType || "",
                File: oData.FileContent || ""
            };

            // Only add BranchCode if it exists (not empty/undefined)
            if (sBranchCode) {
                payloadData.BranchCode = sBranchCode;
            }

            let payload;
            if (oData.ComplaintID) {
                // UPDATE (PUT)
                payload = {
                    data: {
                        ComplaintType: sComplaintType,
                        Description: oData.Description,
                        RoomNo: oData.RoomNo,
                        FileName: oData.FileName || "",
                        FileType: oData.FileType || "",
                        File: oData.FileContent || ""
                    },
                    filters: { ComplaintID: oData.ComplaintID }
                };
                if (sBranchCode) {
                    payload.data.BranchCode = sBranchCode;
                }
            } else {
                // CREATE (POST)
                payload = { data: payloadData };
            }

            try {
                sap.ui.core.BusyIndicator.show(0);

                let response;
                if (oData.ComplaintID) {
                    response = await this.ajaxUpdateWithJQuery("HM_Complaint", payload);
                } else {
                    response = await this.ajaxCreateWithJQuery("HM_Complaint", payload);
                }

                MessageToast.show(this.i18nModel.getText("complaintSavedSuccessfully") || "Complaint saved successfully.");

                await this._refreshComplaints();
                this._oComplaintDialog.close();
                sap.ui.core.BusyIndicator.hide();

            } catch (err) {
                console.error("AJAX error:", err);
                if (err.responseJSON) {
                    console.error("Server message:", err.responseJSON.message);
                }
                MessageToast.show(this.i18nModel.getText("errorSavingComplaint") || "Error saving complaint.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },
        // Helper to refresh complaints table after save
        _refreshComplaints: async function () {
            const oProfileModel = this.getView().getModel("profileData");
            const sUserID = oProfileModel.getProperty("/UserID");
            try {
                const response = await this.ajaxReadWithJQuery("CustomerAndPayment", { UserID: sUserID });
                const aComplain = response?.ComplaintData || [];

                const aComplainData = aComplain.map(complain => ({
                    ComplaintID: complain.ComplaintID,
                    ComplaintType: complain.ComplaintType,
                    Description: complain.Description,
                    ComplaintDescription: complain.Description,
                    ComplaintRaisedDate: complain.ComplaintRaisedDate,
                    ComplaintStatus: complain.Status,
                    RoomNo: complain.RoomNo || "",
                    FileName: complain.FileName || "",
                    FileType: complain.FileType || "",
                    File: complain.File || ""
                }));

                oProfileModel.setProperty("/complain", aComplainData);
                oProfileModel.setProperty("/complainCount", aComplainData.length);
                oProfileModel.updateBindings(true);
                oProfileModel.refresh(true);
            } catch (err) {
                console.error("Failed to refresh complaints", err);
            }
        }, 

        onPressComplaintRow: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("profileData");
            const oComplaint = oContext.getObject();
            // Do not allow editing if complaint is In Progress or Resolved
            if (oComplaint.ComplaintStatus === "In Progress" || oComplaint.ComplaintStatus === "Resolved") {
                MessageToast.show("Complaints with status 'In Progress' or 'Resolved' cannot be edited.");
                return;
            }
            this._openComplaintDialog(oComplaint);
        },
    });
});