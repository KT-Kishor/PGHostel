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
                RoomCombo: [],
                Description: "",
                BranchCode: "",
                FileName: "",
                FileType: "",
                FileContent: "",
                Documents: [],
                isEditMode: false,
                BookingID : "",
                CustomerName : ""
            }), "complaintTemp");

            this.getView().setModel(new JSONModel({mode: "CREATE"}), "viewModel");

            var today = new Date();
            // var maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
            var oDateModel = new sap.ui.model.json.JSONModel();
            oDateModel.setData({
                // maxDate: maxDate,
                focusedDate: new Date(2000, 0, 1),
                minDate: new Date(1950, 0, 1),
                maxdate : new Date()
            });
            this.getView().setModel(oDateModel, "controller");

            // Router matched
            this.getOwnerComponent().getRouter().getRoute("RouteManageProfile").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this.ManageData();
            this.commonLoginFunction()
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

            var model = new JSONModel({


            });
            this.getView().setModel(model, "Member")

        },

        ManageData: async function () {
            // always read current user from models instead of relying solely on cached variable
            let oUser = sap.ui.getCore().getModel("LoginModel")?.getData() ||
                this.getOwnerComponent().getModel("UserModel")?.getData() ||
                this._oLoggedInUser || {};
            // update cached copy so future calls are consistent
            this._oLoggedInUser = oUser;
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
                    Members: [],
                    isEditMode: false,
                    selectedTab: "Booking History",
                    isTableBusy: true
                });

                this.getView().setModel(oTempModel, "profileData");
                this.byId("id_tabBar1").setSelectedKey("Booking History");

                const filter = { UserID: sUserID }
                const response = await this.ajaxReadWithJQuery("CustomerAndPayment", filter);
                const aBookings = response?.BookingData || [];

                const aBranchComboData = this._prepareBranchComboData(aBookings);
                const aAssignedRoomData = this._prepareAssignedRoomData(aBookings);
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
                        // amount: (
                        //     (Number(booking.TotalRoomprice || 0) + Number(booking.FacilityPrice || 0)) +
                        //     ((Number(booking.TotalRoomprice || 0) + Number(booking.FacilityPrice || 0)) * GSTValue) - Number(booking.Discount || 0)
                        // ).toString() || "",
                        amount: (
                            ((Number(booking.TotalRoomprice || 0) + Number(booking.FacilityPrice || 0)) - Number(booking.Discount || 0)) * (1 + GSTValue)
                        ).toString() || "",

                        status: booking.Status,
                        currency: booking.Currency,
                        BookingID: booking.BookingID?.toString() || "",
                        MemberID: booking.MemberID || "",
                        CustomerName: booking.CustomerName || "",
                    }

                });

                const hasAssignedBooking = aBookings.some(b =>
                    b.Status && b.Status.toLowerCase() === "assigned"
                );

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
                    BranchCombo: aBranchComboData,
                    AsgnRoomNo: aAssignedRoomData,
                    selectedBranchCode: "",
                    hasAssignedBooking: hasAssignedBooking,
                    bookings: aBookingData,
                    bookingCount: aBookingData.length,
                    selectedTab: "Booking History",
                    aCustomers: aBookingData.map(booking => ({ BookingID: booking.BookingID, customerName: booking.customerName })),
                    facility: [],
                    isTableBusy: false
                });
                this.getView().setModel(oProfileModel, "profileData");
                oProfileModel.refresh(true);
                // this._prepareBranchComboData()
                this._applyCountryStateCityFilters();

                setTimeout(() => {
                    this._updateRowCount();
                }, 0);

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
                    aCustomers: [],
                    hasAssignedBooking: false,
                });
                this.getView().setModel(oProfileModel, "profileData");
                this._applyCountryStateCityFilters();
                oProfileModel.setProperty("/isEditMode", false);
            } finally {
                this.closeBusyDialog();
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
            const oProfileModel = this.getView().getModel("profileData");
             const oLoginModel  = this.getOwnerComponent().getModel("LoginModel");
              let sPhoto = oProfileModel.getProperty("/photo");
            if (!sPhoto) {
                sap.m.MessageToast.show(this.i18nModel.getText("noProfilePhotoAvailable"));
                return;
            }

             if (!sPhoto.startsWith("data:image")) {
        sPhoto = "data:image/png;base64," + sPhoto;
    }

    // ✅ 1) Update global model (this is the key line)
    oLoginModel.setProperty("/Photo", sPhoto);

      oProfileModel.setProperty("/photo", sPhoto);
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
                    }).addStyleClass("myUnifiedBtn")
                })
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
                  const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
                oModel.setProperty("/photo", fullDataURL);
                 oLoginModel.setProperty("/Photo", fullDataURL);
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
             const oLoginModel  = this.getOwnerComponent().getModel("LoginModel");
            const initials = oModel.getProperty("/initials");

            oModel.setProperty("/photo", "");
            oModel.setProperty("/initials", initials);

              oLoginModel.setProperty("/Photo", "");
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
            const oLoginModel  = this.getOwnerComponent().getModel("LoginModel");
            oModel.setProperty("/fileName", imageName);
            oModel.setProperty("/fileType", mimeType);
            oModel.setProperty("/fileContent", rawBase64);

            // Add this to update UI avatar
            oModel.setProperty("/photo", base64Image);
             oLoginModel.setProperty("/Photo", base64Image);

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
            const oDP = (typeof oEventOrControl.getSource === "function") ? oEventOrControl.getSource() : oEventOrControl;
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
        onProfileDialogClose: function () {
            const oModel = this.getView().getModel("profileData");

            if (this._originalProfileData) {
                oModel.setData(this._originalProfileData);
            }

            oModel.setProperty("/isEditMode", false);

            //  IMPORTANT: clear old backup
            this._originalProfileData = null;
        },
        _resetValidationStates: function () {
            const aControls = [
                "id_Name1",
                "id_mail1",
                "id_dob1",
                "id_country1",
                "id_state1",
                "id_city1",
                "id_phone1",
                "id_gender1",
                "id_address1"
            ];

            aControls.forEach((sId) => {
                const oControl = this.byId(sId);

                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }

                if (oControl && oControl.setValueStateText) {
                    oControl.setValueStateText("");
                }
            });
        },

        onPressAddMember: function () {
            if (!this.UD_Dialog) {
                var oView = this.getView();
                this.UD_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Memberedit", this);
                oView.addDependent(this.UD_Dialog);
            }

            this._mode = "CREATE";
            this.getView().getModel("viewModel").setProperty("/mode", "CREATE");

            const oBookingView = this.getView().getModel("profileData"); // adjust if needed
            const sNewMemberID = this._generateMemberID(oBookingView);
            const sUserID = this.getView().getModel("profileData").getData().UserID 

            //  Empty model for new member
            const oNewMember = {
                MemberID: sNewMemberID,
                UserID: sUserID,
                Salutation: "",
                Name: "",
                Relation: "",
                Gender: "",
                DateOfBirth: "",
                DocumentType: ""
            };

            this.getView().setModel(new JSONModel(oNewMember), "Member");

            //  Clear existing file data
            this._existingFileData = null;
            this._selectedFile = null;

            //  Reset UI fields
            sap.ui.getCore().byId("idSelect").setSelectedKey("").setValueState("None");
            sap.ui.getCore().byId("MM_id_MemberName").setValue("").setValueState("None");
            sap.ui.getCore().byId("MemberDOB").setValue("").setValueState("None");
            sap.ui.getCore().byId("MemberGenderCombo").setSelectedKey("").setValueState("None");
            sap.ui.getCore().byId("MemberRelationCombo").setSelectedKey("").setValueState("None");
            sap.ui.getCore().byId("idDocumentType").setSelectedKey("").setValueState("None");
            sap.ui.getCore().byId("MM_id_FileUploader").setValue("").setValueState("None");

            this.UD_Dialog.open();
        },

        onEditMemberFromDialog: function (oEvent) {
            if (!this.UD_Dialog) {
                var oView = this.getView();
                this.UD_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Memberedit", this);
                oView.addDependent(this.UD_Dialog);
            }

            this._mode = "UPDATE";
            this.getView().getModel("viewModel").setProperty("/mode", "UPDATE");

            var oContext = oEvent.getSource().getBindingContext("profileData");
            var oData = oContext.getObject();

            //  store existing file data
            this._existingFileData = {
                FileName: oData.FileName,
                FileType: oData.FileType,
                File: oData.Attachment, // already base64
                DocumentID: oData.DocumentID,
                DocumentType: oData.DocumentType || "",
                DateOfBirth: oData.DateOfBirth || "",
                Gender: oData.Gender || "",
                Relation: oData.Relation || "",
                MemberID: oData.MemberID || "",
                UserID: oData.UserID || "",
                Salutation: oData.Salutation 
            };

            this.getView().setModel(
                new sap.ui.model.json.JSONModel(this._existingFileData),
                "Member"
            );

            sap.ui.getCore().byId("idDocumentType").setSelectedKey(oData.DocumentType || "").setValueState("None");
            sap.ui.getCore().byId("MM_id_FileUploader").setValue(oData.FileName || "").setValueState("None");
            sap.ui.getCore().byId("MemberDOB").setValue(oData.DateOfBirth.split('-').reverse().join('/') || "").setValueState("None");

            sap.ui.getCore().byId("MemberGenderCombo").setValue(oData.Gender || "").setValueState("None");

            sap.ui.getCore().byId("MemberRelationCombo").setValue(oData.Relation || "").setValueState("None");
            sap.ui.getCore().byId("MM_id_MemberName").setValue(oData.Name || "").setValueState("None");
            sap.ui.getCore().byId("idSelect").setValue(oData.Salutation || "").setValueState("None");
            this.UD_Dialog.open();
        },

        onCloseDialog: function () {
            this.UD_Dialog.close();

        },
        onFacilityFileChange: function (oEvent) {
            var aFiles = oEvent.getParameter("files");

            if (!aFiles || aFiles.length === 0) return;

            //  store selected file globally (or in model)
            this._selectedFile = aFiles[0];
        },
        savepress: function () {
            var oView = sap.ui.getCore()
            var DocumentType = sap.ui.getCore().byId("idDocumentType").getSelectedKey();
            var oMember = this.getView().getModel("Member").getData(); // adjust index if needed


            if (
                utils._LCstrictValidationComboBox(oView.byId("idSelect"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("MM_id_MemberName"), "ID") &&
                utils._LCvalidateDate(oView.byId("MemberDOB"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("MemberGenderCombo"), "ID") &&
                (oMember.Relation === "Self" || utils._LCstrictValidationComboBox(oView.byId("MemberRelationCombo"),
                 "ID")) &&
                utils._LCstrictValidationComboBox(oView.byId("idDocumentType"), "ID")) {


                if (!DocumentType) {
                    sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectDocumentTypeFirst"));
                    return;
                }

                const MAX_SIZE = 2 * 1024 * 1024;

                //  Case 1: New file selected
                if (this._selectedFile) {
                    var file = this._selectedFile;

                    if (file.size > MAX_SIZE) {
                        sap.m.MessageToast.show("File " + file.name + " exceeds 2 MB limit.");
                        return;
                    }

                    var reader = new FileReader();

                    reader.onload = (e) => {
                        var sBase64 = e.target.result.split(",")[1];

                        //  Safe Date Conversion
                        var dob = oMember.DateOfBirth
                            ? oMember.DateOfBirth.split('/').reverse().join('-')
                            : "";

                        const isCreate = this._mode === "CREATE";

                        var oPayload = {
                            Members: [
                                {
                                    MemberID: isCreate ? oMember.MemberID : this._existingFileData.MemberID,
                                    Salutation: oMember.Salutation,
                                    Name: oMember.Name,
                                    Relation: oMember.Relation,
                                    Gender: oMember.Gender,
                                    UserID: isCreate ? oMember.UserID : this._existingFileData.UserID,
                                    DateOfBirth: dob,
                                    Documents: [
                                        {
                                            DocumentID: isCreate ? "" : this._existingFileData.DocumentID,
                                            MemberID: isCreate ? oMember.MemberID : this._existingFileData.MemberID,
                                            UserID: isCreate ? oMember.UserID : this._existingFileData.UserID,
                                            DocumentType: DocumentType,
                                            FileName: file.name,
                                            FileType: file.type,
                                            File: sBase64
                                        }
                                    ]
                                }
                            ]
                        };

                        //  Call inside onload (VERY IMPORTANT)
                        this._uploadDocument(oPayload);
                    };

                    //  Trigger file read
                    reader.readAsDataURL(file);
                }

                //  Case 2: No new file → use existing file
                else if (this._existingFileData) {


                    const isCreate = this._mode === "CREATE";

                    if (isCreate) {
                        sap.m.MessageToast.show("Please upload a file");
                        return;
                    }

                    var oPayload = {
                        Members: [
                            {
                                MemberID: this._existingFileData.MemberID,
                                Salutation: oMember.Salutation,
                                Name: oMember.Name,
                                Relation: oMember.Relation,
                                Gender: oMember.Gender,
                                DateOfBirth: oMember.DateOfBirth.split('/').reverse().join('-'),
                                UserID: this._existingFileData.UserID,
                                Documents: [
                                    {
                                        DocumentID: this._existingFileData.DocumentID,
                                        MemberID: this._existingFileData.MemberID,
                                        UserID: this._existingFileData.UserID,
                                        DocumentType: DocumentType,
                                        FileName: this._existingFileData.FileName,
                                        FileType: this._existingFileData.FileType,
                                        File: this._existingFileData.File
                                    }
                                ]
                            }
                        ]
                    };

                    this._uploadDocument(oPayload);
                }

                else {
                    sap.m.MessageToast.show("Please select a file");
                }
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));

            }
        },
        _uploadDocument: function (oDoc) {
            this.getBusyDialog();

            const isCreate = this._mode === "CREATE";

            const oPromise = isCreate
                ? this.ajaxCreateWithJQuery("HM_MemberDocument", { data: [oDoc] })
                : this.ajaxUpdateWithJQuery("HM_MemberDocument", {
                    data: [oDoc],
                    filters: {
                        DocumentID: this._existingFileData.DocumentID
                    }
                });

            oPromise.then(() => {
                this.onTableSelect();
                this.UD_Dialog.close();
                this._selectedFile = null;
                this._existingFileData = null;
                sap.m.MessageToast.show(this.i18nModel.getText("docUploadSuccess"));
            }).catch(() => {
                sap.m.MessageToast.show(this.i18nModel.getText("Error Uploading Documents"));
            });
        },

        _generateMemberID: function (oBookingView) {
            const sUserID = this.getView().getModel("profileData").getData().UserID || ""
            const aMasterMembers = this.getView().getModel("profileData").getData().Members || [];


            // Filter members that match the UserID pattern (e.g., "00013_XX")
            const aUserMembers = aMasterMembers.filter(function (oMember) {
                if (!oMember.MemberID) return false;
                return String(oMember.MemberID).startsWith(sUserID + "_");
            });

            let iMaxSuffix = 0;

            if (aUserMembers.length > 0) {
                // Extract suffixes and find the maximum
                aUserMembers.forEach(function (oMember) {
                    const sMemberID = String(oMember.MemberID || "");
                    const aParts = sMemberID.split("_");
                    if (aParts.length === 2) {
                        const iSuffix = parseInt(aParts[1], 10);
                        if (!isNaN(iSuffix) && iSuffix > iMaxSuffix) {
                            iMaxSuffix = iSuffix;
                        }
                    }
                });
            }

            // Increment by 1
            const iNewSuffix = iMaxSuffix + 1;

            // Format with leading zeros (2 digits)
            const sFormattedSuffix = iNewSuffix < 10 ? "0" + iNewSuffix : String(iNewSuffix);

            const sNewMemberID = sUserID + "_" + sFormattedSuffix;

            return sNewMemberID;
        },
        onNewMemberSalutationChange: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = this.byId("idSelect");
            // Clear salutation error immediately
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

            // Strict validation (CONTROL, not event)
            utils._LCstrictValidationSelect(oSalutation);
        },
        onNewMemberNameChange: function (oEvent) {
            return utils._LCvalidateName(oEvent);
        },
        onNewMemberDOBChange: function (oEvent) {
            utils._LCvalidateDate(oEvent);
        },
        onNewMemberGenderChange: function (oEvent) {
            return utils._LCstrictValidationComboBox(oEvent);
        },
        onNewMemberRelationChange: function (oEvent) {
            return utils._LCstrictValidationComboBox(oEvent);
        },

        onEditSaveProfile: async function () {
            const oModel = this.getView().getModel("profileData");
            var data = oModel.getData()
            const isEditMode = oModel.getProperty("/isEditMode");
            if (!isEditMode) {
                oModel.setProperty("/isEditMode", true);
                oModel.setProperty("/Country", data.Country);
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
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
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
                this.getBusyDialog();
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                Object.assign(this._oLoggedInUser, payload.data);
                const oLoginmodel = this.getView().getModel("LoginModel");
                oLoginmodel.setProperty("/EmployeeName", payload.data.UserName);
                oLoginmodel.refresh(true);
                MessageToast.show(this.i18nModel.getText("profileUpdatedSuccessfully"));

            } catch (err) {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("errorUpdatingProfile"));
            } finally {
                this.closeBusyDialog();
                oModel.setProperty("/isEditMode", false);
                oModel.refresh(true);

            }
        },

        onPressBookingRow: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("profileData");
            var oBookingData = oContext.getObject();
            var sBookingID = oBookingData.BookingID || "";
            var sMemberID = oBookingData.MemberID || "";

            if (!sBookingID) {
                sap.m.MessageToast.show("BookingID not found for this booking");
                return;
            }

            // Navigate to EditBooking page with BookingID and MemberID
            this.getOwnerComponent().getRouter().navTo("RouteEditBooking", {
                BookingID: encodeURIComponent(sBookingID),
                MemberID: encodeURIComponent(sMemberID)
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
            // if (iDays <= 0) {
            //     MessageToast.show(this.i18nModel.getText("endDatemustbeafterStartDate"));
            //     return null;
            // }

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
            } else if (sSelectedTab === "Damage") {
                oTable = this.byId("Id_DamageTable");
            } else if (sSelectedTab === "Members") {
                oTable = this.byId("Id_MemberTable");
            }

            if (!oTable) return;

            const oBinding = oTable.getBinding("items");
            const length = oBinding ? oBinding.getLength() : 0;

            if (sSelectedTab === "Payment") {
                oProfileModel.setProperty("/paymentCount", length);
            } else if (sSelectedTab === "Booking History") {
                oProfileModel.setProperty("/bookingCount", length);
            } else if (sSelectedTab === "Complaints") {
                oProfileModel.setProperty("/complainCount", length);
            } else if (sSelectedTab === "Damage") {
                oProfileModel.setProperty("/damageCount", length);
            } else if (sSelectedTab === "Members") {
                oProfileModel.setProperty("/memberCount", length);
            }
        },
        onTableSelect: async function (oEvent) {
            const sKey = oEvent ? oEvent.getParameter("key") : "Members";
            const oModel = this.getView().getModel("profileData");
            oModel.setProperty("/selectedTab", sKey);

            // When Payment tab selected, fetch invoices and bind to Payments
            if (sKey === "Payment") {
                try {
                    this.getBusyDialog();
                    const sUserID = oModel.getProperty("/UserID") || this._oLoggedInUser?.UserID || "";
                    if (!sUserID) {
                        MessageToast.show(this.i18nModel.getText("customerIDnotfoundforthisBooking") || "UserID not found.");
                        return;
                    }

                    const resp = await this.ajaxReadWithJQuery("HM_ManageInvoice", { UserID: sUserID });
                    const aInvoiceData = Array.isArray(resp?.data) ? resp.data : (resp?.data ? [resp.data] : []);

                    const aPayments = aInvoiceData.map(inv => ({
                        BookingID: inv.BookingID || inv.BookingId || "",
                        CustomerName: inv.CustomerName || "",
                        InvoiceDate: inv.InvoiceDate || inv.InvoiceDateString || "",
                        InvNo: inv.InvNo || inv.InvNumber || "",
                        TotalAmount: inv.TotalAmount || inv.GrandTotal || 0,
                        DueAmount: inv.DueAmount || inv.DueAmount || 0,
                        currency: inv.Currency || inv.currency || "",
                        PaymentGroup: inv.Status || "Others"
                    }));

                    oModel.setProperty("/Payments", aPayments);
                } catch (err) {
                    sap.m.MessageToast.show(err.message || err.responseText || "Error loading payments");
                } finally {
                    this.closeBusyDialog();
                    // Update counts for table
                    this._updateRowCount();
                }
            }

            // When Complaints tab selected, fetch complaints and bind
            else if (sKey === "Complaints") {
                await this._loadComplaints();
            }

            // When Damage tab selected, fetch damages and bind
            else if (sKey === "Damage") {
                await this._loadDamage();
            }
            else if (sKey === "Members") {
                // await this._loadMembers();
                this.getBusyDialog();
                const sUserID = oModel.getProperty("/UserID") || this._oLoggedInUser?.UserID || "";
                if (!sUserID) {
                    MessageToast.show(this.i18nModel.getText("customerIDnotfoundforthisBooking") || "UserID not found.");
                    return;
                }

                const resp = await this.ajaxReadWithJQuery("HM_MemberDocument", { UserID: sUserID });
                // New structure: { success: true, data: [...], UserDocuments: [...] }
                const aMemberData = Array.isArray(resp?.data) ? resp.data : (resp?.data ? [resp.data] : []);
                const aUserDocuments = resp.data[0].Documents;

                const aMembers = aMemberData.map(mem => {
                    // Handle Documents array - could be empty
                    let oDoc = {};
                    let sAttachment = "";

                    // First check member's own documents
                    if (mem.Documents && mem.Documents.length > 0) {
                        // Take first document
                        oDoc = mem.Documents[0];
                    }
                    // If member is SELF and has no documents, check user documents
                    else if ((mem.Relation || "").toUpperCase() === "SELF" && aUserDocuments.length > 0) {
                        // Take first user document
                        oDoc = aUserDocuments[0];
                    }

                    // Convert Buffer to base64 if needed
                    if (oDoc.File) {
                        if (oDoc.File.type === "Buffer" && Array.isArray(oDoc.File.data)) {
                            // Convert byte array to base64
                            const byteArray = new Uint8Array(oDoc.File.data);
                            let binary = "";
                            for (let i = 0; i < byteArray.length; i++) {
                                binary += String.fromCharCode(byteArray[i]);
                            }
                            sAttachment = btoa(binary);
                        } else if (typeof oDoc.File === "string") {
                            sAttachment = oDoc.File;
                        }
                    }

                    return {
                        Salutation: mem.Salutation || "",
                        Name: mem.Name || "",
                        DateOfBirth: mem.DateOfBirth || "",
                        Gender: mem.Gender || "",
                        Relation: mem.Relation || "",
                        BookingID: mem.BookingID || "",
                        DocumentType: oDoc.DocumentType || "",
                        MemberID: mem.MemberID || "",
                        DocumentID: oDoc.DocumentID || "",
                        UserID: oDoc.UserID || "",
                        Attachment: sAttachment,
                        FileName: oDoc.FileName || "",
                        Salutation: mem.Salutation || "",
                        FileType: oDoc.FileType || ""
                    };
                });

                oModel.setProperty("/Members", aMembers);
                this._updateRowCount();
                this.closeBusyDialog()
            }
        },
        _loadComplaints: async function (bSilent) {
            const oProfileModel = this.getView().getModel("profileData");
            const sUserID = oProfileModel?.getProperty("/UserID") || this._oLoggedInUser?.UserID || "";

            if (!sUserID) {
                if (!bSilent) {
                    MessageToast.show("UserID not found.");
                }
                return;
            }

            try {
                if (!bSilent) this.getBusyDialog();

                const resp = await this.ajaxReadWithJQuery("HM_Complaint", { UserID: sUserID });

                // Normalize response shapes: {data:[...]}, {data:{...}}, or legacy keys
                const aRaw = Array.isArray(resp?.data) ? resp.data
                    : (resp?.data ? [resp.data]
                        : (Array.isArray(resp?.ComplaintData) ? resp.ComplaintData
                            : (Array.isArray(resp?.commentData) ? resp.commentData : [])));

                const oBRModel = this.getOwnerComponent().getModel("sBRModel");
                const aBranchMaster = oBRModel?.getProperty("/") || [];

                const aComplainData = aRaw.map(complain => {
                    const sBranchCode = complain.BranchCode || "";
                    const oBranch = aBranchMaster.find(b => b.BranchID === sBranchCode);

                    return {
                        BookingID : complain.BookingID || "",
                        CustomerName : complain.CustomerName || "",
                        ComplaintID: complain.ComplaintID || complain.ComplainID || complain.ID || "",
                        ComplaintType: complain.ComplaintType || "",
                        Description: complain.Description || "",
                        ComplaintDescription: complain.Description || "",
                        ComplaintRaisedDate: complain.ComplaintRaisedDate || complain.RaisedDate || "",
                        ComplaintStatus: complain.Status || complain.ComplaintStatus || "",
                        BranchCode: sBranchCode,
                        BranchName: oBranch?.Name || sBranchCode,
                        RoomNo: complain.RoomNo || "",
                        FileName: complain.FileName || "",
                        FileType: complain.FileType || "",
                        File: complain.File || "",
                        ExpectedResolvedDate: complain.EstimatDate || complain.ExpectedResolvedDate || "",
                        AssignedTo: complain.AssignedBy || complain.AssignedTo || ""
                    };
                });

                oProfileModel.setProperty("/complain", aComplainData);
                oProfileModel.setProperty("/complainCount", aComplainData.length);
                oProfileModel.updateBindings(true);
            } catch (err) {
                console.error("Error loading complaints", err);
                if (!bSilent) {
                    MessageToast.show(err.message || err.responseText || "Error loading complaints");
                }
            } finally {
                if (!bSilent) {
                    this.closeBusyDialog();
                    this._updateRowCount();
                }
            }
        },

        _loadDamage: async function (bSilent) {
            const oProfileModel = this.getView().getModel("profileData");
            const sUserID = oProfileModel?.getProperty("/UserID") || this._oLoggedInUser?.UserID || "";

            if (!sUserID) {
                if (!bSilent) {
                    MessageToast.show("UserID not found.");
                }
                return;
            }

            try {
                this.getBusyDialog();

                // Backend returns: { success:true, data:{ HM_Damage:[...], HM_DamageItem:[...] } }
                const resp = await this.ajaxReadWithJQuery("getHM_DamageBoth", { UserID: sUserID });


                const aHeader = resp?.data?.HM_Damage || [];
                const aItems = resp?.data?.HM_DamageItem || [];

                // Branch master for BranchName mapping
                const oBRModel = this.getOwnerComponent().getModel("sBRModel");
                const aBranchMaster = oBRModel?.getProperty("/") || [];

                const mHeaderByDamageId = new Map();
                aHeader.forEach(h => {
                    const sDamageID = h.DamageID || "";
                    if (!sDamageID) { return; }

                    const sBranchCode = h.BranchCode || "";
                    const oBranch = aBranchMaster.find(b => b.BranchID === sBranchCode);

                    mHeaderByDamageId.set(sDamageID, {
                        DamageID: sDamageID,
                        BookingID: h.BookingID || "",
                        UserID: h.UserID || "",
                        CustomerName: h.CustomerName || "",
                        CustomerEmail: h.CustomerEmail || "",
                        RoomNo: h.RoomNo || "",
                        Currency: (h.Currency || "").trim(),
                        Status: h.Status || "",
                        BedTypeName: h.BedTypeName || "",
                        BranchCode: sBranchCode,
                        BranchName: oBranch?.Name || sBranchCode,
                        TotalCost: h.TotalCost ?? "",
                        ReturnDamageAmount: h.ReturnDamageAmount ?? "",
                        ReturnDamageMode: h.ReturnDamageMode ?? "",
                        ReturnDamageTransactionID: h.ReturnDamageTransactionID ?? "",
                        ReturnDamageDate: h.ReturnDamageDate || null,
                        ReturningEmployeeName: h.ReturningEmployeeName || "",
                        InvoiceDate: h.InvoiceDate || null
                    });
                });

                // Build rows at item-level (one row per item). If no items for a damage, still show one row.
                const mItemsByDamageId = new Map();
                aItems.forEach(it => {
                    const sDamageID = it.DamageID || "";
                    if (!sDamageID) { return; }
                    if (!mItemsByDamageId.has(sDamageID)) {
                        mItemsByDamageId.set(sDamageID, []);
                    }
                    mItemsByDamageId.get(sDamageID).push(it);
                });

                const aDamageRows = [];
                for (const [sDamageID, oHeader] of mHeaderByDamageId.entries()) {
                    const aIts = mItemsByDamageId.get(sDamageID) || [];
                    if (aIts.length === 0) {
                        aDamageRows.push({
                            ...oHeader,
                            ItemID: "",
                            ItemName: "",
                            Type: "",
                            Description: "",
                            Quantity: "",
                            Cost: "",
                            ItemCurrency: ""
                        });
                    } else {
                        aIts.forEach(it => {
                            aDamageRows.push({
                                ...oHeader,
                                ItemID: it.ItemID || "",
                                ItemName: it.ItemName || "",
                                Type: it.Type || "",
                                Description: it.Description || "",
                                Quantity: it.Quantity ?? "",
                                Cost: it.Cost ?? "",
                                ItemCurrency: (it.Currency || "").trim()
                            });
                        });
                    }
                }

                // In case backend returns items with DamageIDs not present in header list
                aItems.forEach(it => {
                    const sDamageID = it.DamageID || "";
                    if (sDamageID && !mHeaderByDamageId.has(sDamageID)) {
                        aDamageRows.push({
                            DamageID: sDamageID,
                            BranchCode: "",
                            BranchName: "",
                            RoomNo: "",
                            Status: "",
                            Currency: "",
                            TotalCost: "",
                            ItemID: it.ItemID || "",
                            ItemName: it.ItemName || "",
                            Type: it.Type || "",
                            Description: it.Description || "",
                            Quantity: it.Quantity ?? "",
                            Cost: it.Cost ?? "",
                            ItemCurrency: (it.Currency || "").trim()
                        });
                    }
                });

                oProfileModel.setProperty("/damage", aDamageRows);
                oProfileModel.setProperty("/damageCount", aDamageRows.length);
                oProfileModel.updateBindings(true);

            } catch (err) {
                console.error("Error loading damage", err);
                if (!bSilent) {
                    MessageToast.show(err?.message || err?.responseText || "Error loading damage");
                }
            } finally {
                this.closeBusyDialog();
                this._updateRowCount();
            }
        },

        onlogout: function () {

            // clear profile model and cached user info so next login starts fresh
            // remove any profile data both locally and globally
            this.getView().getModel("profileData").setData({});
            sap.ui.getCore().setModel(null, "profileData");
            this._oLoggedInUser = {};
            const oUserModel = this.getOwnerComponent().getModel("UserModel");
            if (oUserModel) {
                oUserModel.setData({});
            }

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

            // Decide table by selected tab
            let oTable = null;
            if (sSelectedTab === "Payment") {
                oTable = this.byId("Id_PaymentTable1");
            } else if (sSelectedTab === "Booking History") {
                oTable = this.byId("Id_ProfileaTable1");
            } else if (sSelectedTab === "Complaints") {
                oTable = this.byId("Id_CompmaintTable");
            } else if (sSelectedTab === "Damage") {
                oTable = this.byId("Id_DamageTable");
            }
            if (!oTable) {
                return;
            }

            const oBinding = oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            // Apply filters for current tab table
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
                } else if (sSelectedTab === "Complaints") {
                    aFilters = [
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("CustomerName", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("BookingID", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("ComplaintID", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("ComplaintType", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("BranchName", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("RoomNo", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("ComplaintDescription", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("ComplaintStatus", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("ComplaintRaisedDate", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("ExpectedResolvedDate", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("AssignedTo", sap.ui.model.FilterOperator.Contains, sQuery.toString())
                            ],
                            and: false
                        })
                    ];
                } else if (sSelectedTab === "Damage") {
                    aFilters = [
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("DamageID", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("BranchName", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("RoomNo", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("ItemName", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("Type", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("Quantity", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("Cost", sap.ui.model.FilterOperator.Contains, sQuery.toString()),
                                new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, sQuery.toString())
                            ],
                            and: false
                        })
                    ];
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
            const oSTD = this.byId("id_std1");
            //const oMobile = this.byId("id_phone1"); // not needed here

            const std1 = oSTD.getValue();
            // NOTE: do **not** clear the mobile field on every keystroke –
            // this was preventing users from typing anything.

            // Dynamic mobile length based on selected STD code
            // apply to the input itself (oInput) instead of always using oMobile
            if (std1 === "+91") {
                oInput.setMaxLength(10);
            } else {
                oInput.setMaxLength(18);
            }

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
        _prepareBranchComboData: function (aBookingData) {

            if (!Array.isArray(aBookingData)) {
                return [];
            }
            // 1. Filter only Assigned bookings
            const aAssigned = aBookingData.filter(b => b.Status?.toLowerCase() === "assigned");

            // 2. Extract unique BranchCodes
            const aUniqueBranchCodes = [
                ...new Set(
                    aAssigned
                        .map(b => b.BranchCode)
                        .filter(Boolean)
                )
            ];
            // 3. Get Branch Master data from global model
            const oBRModel = this.getOwnerComponent().getModel("sBRModel");
            const aBranchMaster = oBRModel?.getProperty("/") || [];
            // 4. Map BranchCode → BranchName
            const aFinal = aUniqueBranchCodes.map(code => {
                const branchObj = aBranchMaster.find(b => b.BranchID === code);
                return {
                    BranchCode: code,
                    BranchName: branchObj?.Name || code
                };
            });
            return aFinal;
        },
        _prepareAssignedRoomData: function (aBookingData) {
            if (!Array.isArray(aBookingData)) {
                return [];
            }

            const oUnique = new Set();
            return aBookingData
                .filter(function (oBooking) {
                    return oBooking.Status?.toLowerCase() === "assigned" && oBooking.BranchCode && oBooking.RoomNo;
                })
                .map(function (oBooking) {
                    return {
                        BranchCode: String(oBooking.BranchCode || "").trim(),
                        RoomNo: String(oBooking.RoomNo || "").trim()
                    };
                })
                .filter(function (oRoom) {
                    if (!oRoom.BranchCode || !oRoom.RoomNo) {
                        return false;
                    }
                    const sKey = oRoom.BranchCode + "|" + oRoom.RoomNo;
                    if (oUnique.has(sKey)) {
                        return false;
                    }
                    oUnique.add(sKey);
                    return true;
                });
        },


        _setComplaintRoomComboData: function (sBranchCode, sSelectedRoomNo) {
            const oView = this.getView();
            const oProfileModel = oView.getModel("profileData");
            const oTempModel = oView.getModel("complaintTemp");

            if (!oProfileModel || !oTempModel) {
                return;
            }

            const sBranch = (sBranchCode || "").trim();
            const sRoomNo = (sSelectedRoomNo || "").trim();
            const aAssignedRooms = oProfileModel.getProperty("/AsgnRoomNo") || [];
            const aRoomCombo = sBranch ? aAssignedRooms
                .filter(function (oRoom) {
                    return oRoom.BranchCode === sBranch;
                })
                .map(function (oRoom) {
                    return {
                        RoomNo: oRoom.RoomNo
                    };
                }) : [];

            oTempModel.setProperty("/RoomCombo", aRoomCombo);

            let sNewRoom = sRoomNo;
            if (aRoomCombo.length === 1) {
                sNewRoom = aRoomCombo[0].RoomNo;
            } else {
                const bValidRoom = sRoomNo && aRoomCombo.some(function (oRoom) {
                    return oRoom.RoomNo === sRoomNo;
                });
                if (!bValidRoom) sNewRoom = "";
            }

            oTempModel.setProperty("/RoomNo", sNewRoom);

            const oRoomCombo = this._getComplaintControl("idComplaintRoom");
            if (oRoomCombo) {
                oRoomCombo.setEditable(aRoomCombo.length !== 1);
                // oRoomCombo.isEditMode(aRoomCombo.length !== 1);
            }
        },

        onPressRaiseComplaint: function () {
            this._openComplaintDialog(); // no data → create mode
        },

        _openComplaintDialog: function (oComplaintData) {
            const oView = this.getView();
            const oTempModel = oView.getModel("complaintTemp");
            const oProfileModel = oView.getModel("profileData");

            if (oComplaintData) {

                oProfileModel.setProperty(
                    "/selectedBranchCode",
                    oComplaintData.BranchCode?.trim() || ""
                );
                // Get raw file data – could be byte array, Buffer object, or base64 string
                let rawFile = oComplaintData.File || oComplaintData.FileContent || "";
                let base64File = "";
                let fileSize = 0;

                if (rawFile) {
                    // Handle Buffer-like object
                    if (
                        typeof rawFile === "object" &&
                        rawFile.data &&
                        Array.isArray(rawFile.data)
                    ) {
                        rawFile = rawFile.data;
                    }

                    if (Array.isArray(rawFile)) {

                        // Convert byte array to base64
                        const byteArray = new Uint8Array(rawFile);
                        fileSize = byteArray.length;

                        let binary = "";

                        for (let i = 0; i < byteArray.length; i++) {
                            binary += String.fromCharCode(byteArray[i]);
                        }

                        base64File = btoa(binary);

                    } else if (typeof rawFile === "string" && rawFile) {

                        // Already base64
                        base64File = rawFile;
                        fileSize = Math.ceil(rawFile.length * 0.75);
                    }
                }

                const sExistingFileName = oComplaintData.FileName || "";
                const sExistingFileType = oComplaintData.FileType || "";

                const aDocuments = sExistingFileName
                    ? [{
                        FileName: sExistingFileName,
                        DocumentType: sExistingFileType,
                        FileType: sExistingFileType,
                        File: base64File,
                        Base64: base64File,
                        size: fileSize,
                        // DocType: "Attachment"
                    }]
                    : [];

                // Set edit data
                oTempModel.setData({
                    ComplaintID: oComplaintData.ComplaintID || "",
                    ComplaintType: oComplaintData.ComplaintType || "",
                    RoomNo: oComplaintData.RoomNo || "",
                    RoomCombo: [],
                    Description: oComplaintData.Description || oComplaintData.ComplaintDescription || "",
                    BranchCode: oComplaintData.BranchCode?.trim() || "",
                    CustomerName: oComplaintData.CustomerName || "",
                    BookingID: oComplaintData.BookingID || "",
                    FileName: sExistingFileName,
                    FileType: sExistingFileType,
                    FileContent: base64File,
                    Documents: aDocuments,
                    isEditMode: true
                });

                // Store selected branch globally
                this.BranchCode = oComplaintData.BranchCode?.trim() || "";

                // Load room combo
                this._setComplaintRoomComboData(
                    oTempModel.getProperty("/BranchCode"),
                    oTempModel.getProperty("/RoomNo")
                );

                // Load customer booking data
                if (this.BranchCode) {

                this.onSearch().then(() => {

                    const sCustomerName =
                        (oComplaintData.CustomerName || "").trim();

                    const sBookingID =
                        (oComplaintData.BookingID || "").trim();

                    // Update model
                    oTempModel.setProperty("/CustomerName", sCustomerName);
                    oTempModel.setProperty("/BookingID", sBookingID);

                    sap.ui.getCore().applyChanges();

                    // Get controls
                    const oCustomerCombo =
                        this._getComplaintControl("MP_id_AddCustComboBox");

                    const oBookingCombo =
                        this._getComplaintControl("MP_id_AddBooking");

                    // Force selected keys
                    if (oCustomerCombo) {
                        oCustomerCombo.setSelectedKey(sCustomerName);
                        oCustomerCombo.setValue(sCustomerName);
                    }

                    if (oBookingCombo) {
                        oBookingCombo.setSelectedKey(sBookingID);
                        oBookingCombo.setValue(sBookingID);
                    }

                });
            }

            } else {

                const aBranches = oProfileModel.getProperty("/BranchCombo") || [];

                const sDefaultBranchCode =
                    aBranches.length === 1
                        ? aBranches[0].BranchCode
                        : "";

                // Reset for new complaint
                oTempModel.setData({
                    ComplaintID: "",
                    ComplaintType: "",
                    RoomNo: "",
                    RoomCombo: [],
                    Description: "",
                    BranchCode: sDefaultBranchCode,
                    CustomerName: "",
                    BookingID: "",
                    FileName: "",
                    FileType: "",
                    FileContent: "",
                    Documents: [],
                    isEditMode: false
                });

                // Auto load room + customer data if branch already selected
                if (sDefaultBranchCode) {

                    this.BranchCode = sDefaultBranchCode;

                    // Load room combo
                    this._setComplaintRoomComboData(
                        sDefaultBranchCode,
                        ""
                    );

                    // Auto search customer booking data
                    this.onSearch();

                } else {

                    this._setComplaintRoomComboData("", "");
                }
            }

            const sDialogTitle = oComplaintData
                ? "Edit Complaint"
                : "Raise New Complaint";

            const fnUpdateUI = () => {

                const aBranches =
                    oProfileModel.getProperty("/BranchCombo") || [];

                const oBranchCombo =
                    this._getComplaintControl("idBranchCombo");

                if (oBranchCombo) {
                    oBranchCombo.setEditable(aBranches.length !== 1);
                }

                const aRooms =
                    oTempModel.getProperty("/RoomCombo") || [];

                const oRoomCombo =
                    this._getComplaintControl("idComplaintRoom");

                if (oRoomCombo) {
                    oRoomCombo.setEditable(aRooms.length !== 1);
                }
            };

            // Open dialog
            if (!this._oComplaintDialog) {

                Fragment.load({
                    name: "sap.ui.com.project1.fragment.Complaint",
                    controller: this
                }).then(function (oDialog) {

                    this._oComplaintDialog = oDialog;

                    oView.addDependent(oDialog);

                    this._oComplaintDialog.setTitle(sDialogTitle);

                    oDialog.open();

                    this._resetComplaintValidationStates();
                    fnUpdateUI();
                }.bind(this));
            } else {
                this._oComplaintDialog.setTitle(sDialogTitle);
                this._oComplaintDialog.open();
                this._resetComplaintValidationStates();
                fnUpdateUI();
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

            // Reset complaintTemp model
            const oTempModel = this.getView().getModel("complaintTemp");
            if (oTempModel) {
                oTempModel.setData({
                    ComplaintID: "",
                    ComplaintType: "",
                    RoomNo: "",
                    RoomCombo: [],
                    Description: "",
                    BranchCode: "",
                    FileName: "",
                    FileType: "",
                    FileContent: "",
                    BookingID : "",
                    CustomerName : "",
                    Documents: [],
                    isEditMode: false
                });
            }

            // Force clear ComboBox manual input
            const oBranchCombo = this._getComplaintControl("idBranchCombo");
            if (oBranchCombo) {
                oBranchCombo.setValue("");
                oBranchCombo.setSelectedKey("");
            }
            const oRoomCombo = this._getComplaintControl("idComplaintRoom");
            if (oRoomCombo) {
                oRoomCombo.setValue("");
                oRoomCombo.setSelectedKey("");
            }

            this._resetComplaintValidationStates();
        },
        _getComplaintControl: function (sId) {
            return sap.ui.getCore().byId(sId) || this.byId(sId);
        },
        _resetComplaintValidationStates: function () {

            const aControls = [
                this._getComplaintControl("idBranchCombo"),      // ← Added
                this._getComplaintControl("idComplaintType"),
                this._getComplaintControl("idComplaintRoom"),
                this._getComplaintControl("idComplaintDesc"),
                this._getComplaintControl("MP_id_AddCustComboBox"),
                this._getComplaintControl("MP_id_AddBooking")

            ];

            aControls.forEach(function (oControl) {
                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                    // oControl.setValueStateText("");
                }
            });
        },

        onExit: function () {
            if (this._oComplaintDialog) {
                this._oComplaintDialog.destroy();
                this._oComplaintDialog = null;
            }

            if (this._oComplaintPreviewDialog) {
                this._oComplaintPreviewDialog.destroy();
                this._oComplaintPreviewDialog = null;
            }
        },
        onComplaintTypeChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },
        onComplaintRoomChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
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


                // Create a temporary image to detect orientation and dimensions
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

                    const oHtml = new sap.ui.core.HTML({
                        sanitizeContent: false,
                        content: `
            <div class="preview-image-container">
                <img src="${sImageSrc}" />
            </div>
        `
                    });

                    this._oComplaintPreviewDialog = new sap.m.Dialog({
                        title: oDoc.FileName || "Document Preview",
                        contentWidth: finalWidth + "px",
                        contentHeight: finalHeight + "px",
                        draggable: true,
                        resizable: true,
                        contentPadding: "0rem",
                        horizontalScrolling: false,
                        verticalScrolling: false,
                        content: [oHtml],
                        beginButton: new sap.m.Button({
                            text: "Close",
                            addstyleClass: "myUnifiedBtn",
                            press: () => this._oComplaintPreviewDialog.close()
                        }),
                        afterClose: () => {
                            this._oComplaintPreviewDialog.destroy();
                            this._oComplaintPreviewDialog = null;
                        }
                    });

                    this.getView().addDependent(this._oComplaintPreviewDialog);
                    this._oComplaintPreviewDialog.open();

                }.bind(this);

                oImg.src = sImageSrc;
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
            const oBranchCombo = this._getComplaintControl("idBranchCombo");
            const oBookingID = this._getComplaintControl("MP_id_AddBooking");
            const oCustomerName = this._getComplaintControl("MP_id_AddCustComboBox");


            if (!utils._LCstrictValidationComboBox(oBranchCombo, "ID") ||
                !utils._LCstrictValidationComboBox(oRoomNo, "ID") ||
                !utils._LCstrictValidationComboBox(oCustomerName, "ID") ||
                !utils._LCstrictValidationComboBox(oBookingID, "ID") ||
                !utils._LCvalidateMandatoryField(oComplaintType, "ID") ||
                !utils._LCvalidateMandatoryField(oDescription, "ID")) {
                MessageToast.show("Please fill all required fields.");
                return;
            }
            const sUserID = this._oLoggedInUser.UserID;
            const sUserName = this._oLoggedInUser.UserName; // RaisedBy

            const sToday = new Date().toISOString().split("T")[0];

            const sComplaintType = oComplaintType.getValue();
            const sBranchCode = oBranchCombo.getSelectedKey();


            const payloadData = {
                UserID: sUserID,
                RaisedBy: sUserName,
                ComplaintType: sComplaintType,
                Description: oData.Description,
                Status: "Pending",
                ComplaintRaisedDate: sToday,
                RoomNo: oData.RoomNo,
                BranchCode: sBranchCode,   // ← from ComboBox ONLY
                FileName: oData.FileName || "",
                FileType: oData.FileType || "",
                File: oData.FileContent || "",
                BookingID : oData.BookingID,
                CustomerName : oData.CustomerName
            };



            let payload;
            if (oData.ComplaintID) {
                payload = {
                    data: {
                        ComplaintType: sComplaintType,
                        Description: oData.Description,
                        RoomNo: oData.RoomNo,
                        BranchCode: sBranchCode,   // ← also here
                        FileName: oData.FileName || "",
                        FileType: oData.FileType || "",
                        File: oData.FileContent || ""
                    },
                    filters: { ComplaintID: oData.ComplaintID }
                };
            } else {
                payload = { data: payloadData };
            }

            try {
                this.getBusyDialog();

                let response;
                if (oData.ComplaintID) {
                    response = await this.ajaxUpdateWithJQuery("HM_Complaint", payload);
                } else {
                    response = await this.ajaxCreateWithJQuery("HM_Complaint", payload);
                }
                this._oComplaintDialog.close();

                const sSuccessMsg = oData.ComplaintID
                    ? (this.i18nModel.getText("complaintUpdatedSuccessfully"))
                    : (this.i18nModel.getText("complaintSavedSuccessfully"));
                MessageToast.show(sSuccessMsg);
                oView.getModel("profileData")?.setProperty("/selectedTab", "Complaints");
                this.byId("id_tabBar1")?.setSelectedKey("Complaints");
                await this._refreshComplaints();

                this.closeBusyDialog();

            } catch (err) {
                console.error("AJAX error:", err);
                if (err.responseJSON) {
                    console.error("Server message:", err.responseJSON.message);
                }
                MessageToast.show(this.i18nModel.getText("errorSavingComplaint") || "Error saving complaint.");
            } finally {
                this.closeBusyDialog();
            }
        },
        // Helper to refresh complaints table after save
        _refreshComplaints: async function () {
            // Backward-compatible: keep existing call sites after save/update
            await this._loadComplaints(true);
        },

        onPressComplaintRow: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("profileData");
            const oComplaint = oContext.getObject();

            const status = (oComplaint.ComplaintStatus || "").trim().toLowerCase();

            const aBlockedStatuses = ["in progress", "resolved"];

            if (aBlockedStatuses.includes(status)) {
                MessageToast.show(
                    "Complaints with status 'In Progress' or 'Resolved' cannot be edited"
                );
                return;
            }
            this._openComplaintDialog(oComplaint);
        },

        onComBranch: async function (oEvent) {
            const oBranchCombo = oEvent.getSource();
            const bValidBranch = utils._LCstrictValidationComboBox(oBranchCombo, "ID");
            const sBranchCode = bValidBranch ? oBranchCombo.getSelectedKey() : "";
            this.BranchCode = sBranchCode; // Store globally if needed elsewhere
            this._setComplaintRoomComboData(sBranchCode, ""); // Store globally if needed elsewhere
            this.getView().setModel(new JSONModel([]), "customerbookingdata");  // Clear previous customer/booking data

            if (sBranchCode) {
                await this.onSearch();
            }
        },

        onSearch: function () {

            return new Promise((resolve, reject) => {

                this.getBusyDialog()

                const filter = {
                    BranchCode: this.BranchCode,
                    UserID: this._oLoggedInUser.UserID,
                    Status: "Assigned"
                };

                this.ajaxReadWithJQuery("HM_CustomerReadCall", filter)

                    .then((oData) => {

                        let aData = [];

                        if (Array.isArray(oData.commentData)) {
                            aData = oData.commentData;
                        } else if (oData.commentData) {
                            aData = [oData.commentData];
                        }

                        // Clean values
                        aData = aData.map(item => ({
                            ...item,
                            CustomerName:
                                (item.CustomerName || "").trim(),

                            BookingID:
                                (item.BookingID || "").trim()
                        }));

                        this.getView().setModel(
                            new sap.ui.model.json.JSONModel(aData),
                            "customerbookingdata"
                        );

                        sap.ui.getCore().applyChanges();

                        resolve(aData);
                        this.closeBusyDialog()
                    })

                    .catch((err) => {

                        MessageToast.show(
                            err.responseText ||
                            "Failed to Load Customer Data."
                        );
                        this.closeBusyDialog()
                        reject(err);
                    });
            });
        },

        onChangeAddCustomer: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
            const oCombo = oEvent.getSource();
            const sCustomer = oCombo.getSelectedKey();

            const aData = this.getView().getModel("customerbookingdata").getData() || [];
            const oSelected = aData.find(item =>
                item.CustomerName === sCustomer
            );

            if (oSelected) {
                const oTempModel = this.getView().getModel("complaintTemp");
                oTempModel.setProperty("/CustomerName", oSelected.CustomerName);
                oTempModel.setProperty("/BookingID", oSelected.BookingID);
            }
        },

        onChangeBookingID: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent);

            const oCombo = oEvent.getSource();
            const sBookingID = oCombo.getSelectedKey();
            const aData = this.getView().getModel("customerbookingdata").getData() || [];
            const oSelected = aData.find(item =>
                item.BookingID === sBookingID
            );

            if (oSelected) {
                const oTempModel = this.getView().getModel("complaintTemp");
                oTempModel.setProperty("/BookingID", oSelected.BookingID);
                oTempModel.setProperty("/CustomerName", oSelected.CustomerName);
            }
        },

        HF_viewimage: function (oEvent) {
            function autoDecodeBase64(b64) {
                if (!b64) return "";
                b64 = b64.replace(/\s/g, "");
                let last = b64;

                for (let i = 0; i < 5; i++) {
                    try {
                        if (
                            last.startsWith("iVB") ||   // PNG
                            last.startsWith("/9j") ||   // JPG
                            last.startsWith("JVBER")   // PDF
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

            const oContext = oEvent.getSource().getBindingContext("profileData");
            const oData = oContext?.getObject();

            if (!oData || !oData.Attachment) {
                sap.m.MessageToast.show("No document found");
                return;
            }

            const sBase64 = autoDecodeBase64(oData.Attachment);

            // 🔹 Detect MIME type
            let sMimeType = "application/octet-stream";

            if (sBase64.startsWith("iVB")) {
                sMimeType = "image/png";
            } else if (sBase64.startsWith("/9j")) {
                sMimeType = "image/jpeg";
            } else if (sBase64.startsWith("JVBER")) {
                sMimeType = "application/pdf";
            }

            // ================= IMAGE PREVIEW =================
            if (sMimeType.startsWith("image/")) {

                const sImageSrc = `data:${sMimeType};base64,${sBase64}`;

                if (!this._oHFPreviewDialog) {

                    const oFlex = new sap.m.FlexBox({
                        width: "100%",
                        height: "100%",
                        justifyContent: "Center",
                        alignItems: "Center",
                        items: [
                            new sap.m.Image(this.createId("hfPreviewImage"), {
                                width: "100%",
                                height: "100%",
                                densityAware: false
                            })
                        ]
                    });

                    this._oHFPreviewDialog = new sap.m.Dialog({
                        title: oData.FileName || "Image Preview",
                        contentWidth: "50%",
                        contentHeight: "60%",
                        draggable: true,
                        resizable: true,
                        contentPadding: "0rem",
                        content: [oFlex],

                        beginButton: new sap.m.Button({
                            text: "Close",
                            press: function () {
                                this._oHFPreviewDialog.close();
                            }.bind(this)
                        }).addStyleClass("myUnifiedBtn"),

                        afterClose: function () {
                            this._oHFPreviewDialog.destroy();
                            this._oHFPreviewDialog = null;
                        }.bind(this)
                    });

                    this.getView().addDependent(this._oHFPreviewDialog);
                } else {
                    this._oHFPreviewDialog.setTitle(oData.FileName || "Image Preview");
                }

                this.byId("hfPreviewImage").setSrc(sImageSrc);
                this._oHFPreviewDialog.open();
                return;
            }

            // ================= PDF PREVIEW =================
            if (sMimeType === "application/pdf") {

                if (!this._oHFPreviewDialog) {
                    this._oHFPreviewDialog = new sap.m.Dialog({
                        title: "Document Preview",
                        stretch: true,
                        draggable: true,
                        resizable: true,
                        contentWidth: "50%",
                        contentHeight: "60%",
                        contentPadding: "0rem",

                        endButton: new sap.m.Button({
                            text: "Close",
                            press: () => {
                                if (this._previewUrl) {
                                    URL.revokeObjectURL(this._previewUrl);
                                    this._previewUrl = null;
                                }
                                this._oHFPreviewDialog.close();
                            }
                        }),

                        afterClose: function () {
                            this._oHFPreviewDialog.destroy();
                            this._oHFPreviewDialog = null;
                        }.bind(this)
                    });

                    this.getView().addDependent(this._oHFPreviewDialog);
                }

                this._oHFPreviewDialog.removeAllContent();

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

                const blob = new Blob(byteArrays, { type: sMimeType });

                if (this._previewUrl) {
                    URL.revokeObjectURL(this._previewUrl);
                }

                this._previewUrl = URL.createObjectURL(blob);

                this._oHFPreviewDialog.addContent(
                    new sap.ui.core.HTML({
                        sanitizeContent: false,
                        content: `
                            <iframe 
                                src="${this._previewUrl}" 
                                style="width:100%; height:600px; border:none;">
                            </iframe>
                        `
                    })
                );

                this._oHFPreviewDialog.open();
                return;
            }

            sap.m.MessageToast.show("Preview not supported.");
        }
    });
});