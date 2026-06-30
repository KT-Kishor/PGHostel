sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Token",
     "../utils/validation",
], function (BaseController, JSONModel, MessageToast, MessageBox, Token, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.TilePage", {
        onInit: function () {
            this._initGuideStateModel();
            this.getOwnerComponent().getRouter().getRoute("TilePage").attachMatched(this._onRouteMatched, this);
        },

        _initGuideStateModel: function () {
            if (!this.getView().getModel("tilePageView")) {
                this.getView().setModel(new JSONModel({
                    isStepsGuideVisible: true
                }), "tilePageView");
            }
            this._bStartingTileGuide = false;
        },

        _setStepsGuideButtonVisible: function (bVisible) {
            var oModel = this.getView().getModel("tilePageView");
            if (oModel) {
                oModel.setProperty("/isStepsGuideVisible", bVisible);
            }
        },

        _handleRoleGuideAfterClose: function () {
            if (this._bStartingTileGuide) {
                this._bStartingTileGuide = false;
                return;
            }
            this._setStepsGuideButtonVisible(true);
        },

        _onRouteMatched: async function () {
            this.getBusyDialog()
            var LoginFUnction = await this.commonLoginFunction("TilePage");
            if (!LoginFUnction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
             this.getView().setModel(
                new JSONModel({
                    tokens: []
                }),
                "tokenModel"
            );
             const oUploaderData = new JSONModel({
                attachments: []
            });
            this.getView().setModel(oUploaderData, "UploaderData");
             var model = new JSONModel({
                AppName: "",
                BugDescription: "",
                RaisedBy: "",
                Email: ""
            });
            this.getView().setModel(model, "RaiseBugModel")
            this.AppVisibilityReadCall();
        },

        AppVisibilityReadCall: async function () {
            try {
                const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
                let filter = { Role: oLoginModel.getProperty("/Role") }
                const oData = await this.ajaxReadWithJQuery("HM_AppVisibility", filter);
                var oModel = new JSONModel(oData.data[0]);
                this.getOwnerComponent().setModel(oModel, "TileVisibility");
            } catch (err) {
                this.closeBusyDialog()
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        onMyBookingsPress: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMyBookings");
        },

        TileV_onpressInbox: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAdmin",{
                sPath:"TilePage"
            });
        },

        Tile_onLogPress: function () {
            this.CommonLogoutFunction();
        },

        TileV_onpressroomdetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomDetails");
        },

        TileV_onpressbeddetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBedDetails",{
                sPath:"Tile Page"
            });
        },

        TileV_onpressextrafacilities: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitis", { 
                value: "Facilities",
                sPath: "TilePage"
               });
        },

        TileV_onpressBedImages: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomImages");
        },

        TileV_onpressfacilities: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitiesDetails");
        },

        TileV_onpressmaintaindata: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteMaintainData");
        },

        TileV_onpressBranchdata: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBranchData");
        },

        TileV_onpresshostelfeatures: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostelFeatures");
        },

        TileV_onpressManageInvoice: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageInvoice",{
                sPath:"TilePage"
            });
        },

        TileV_onpressCouponDetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCouponDetails");
        },

        TileV_onpressManageStaff: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageStaff");
        },

        TileV_onpressManageVendor: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageVendor",{
                sPath:"TilePage"
            });
        },

        TileV_onpressPayment: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RoutePayment");
        },

        TileV_onpressDeposit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDeposit");
        },

        TileV_onpressdashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDashboard");
        },

        TileV_onpresshosteldashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostelDashboard");
        },

        TileV_onpresscustomerreview: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCustomerReview");
        },

        TileV_onpresscomplaintdashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteComplainDashboard", {
                sPath: "Dashboard"
            });
        },
        TileV_onpressComplaintdetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteComplaintDetails");
        },

        TileV_onpressdamage: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDamage",{
                sPath:"TilePage"
            });
        },

        TileV_onpressdamagedashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDamageDashboard");
        },
          TileV_onpressSupportVendor: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteSupportDetails");
        },
          TileV_onpressBugRaiseVendor: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBugDetails");
        },
          TileV_onpressManageAds: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageAds");
        },

        // onStartGuide: function () {
        //     if (!this._oGuideDialog) {
        //         this._oGuideDialog = new sap.m.Dialog({
        //             title: "Steps to Know",
        //             contentWidth: "60vw",
        //             contentHeight: "36.8vw",
        //             resizable: true,
        //             draggable: true,
        //             verticalScrolling: false,
        //             horizontalScrolling: false,
        //             content: [
        //                 new sap.m.Image({
        //                     src: "image/Guide.jpg",
        //                     width: "100%",
        //                     height: "100%",
        //                     decorative: false,
        //                     densityAware: false
        //                 }).addStyleClass("PG-fitImage") 
        //             ],
        //             endButton: new sap.m.Button({
        //                 text: "Close",
        //                 press: function () {
        //                     this._oGuideDialog.close();
        //                 }.bind(this)
        //             }).addStyleClass("myUnifiedBtn")
        //         }).addStyleClass("barheader PG-noPaddingDialog"); 
        //         this.getView().addDependent(this._oGuideDialog);
        //     }
        //     this._oGuideDialog.open();
        // },

        Tile_onHomePress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        // ─── ROLE ACCESS CONFIG ────────────────────────────────────────────────────
        // Maps each role to its guide metadata
        _getRoleGuideConfig: function (sRole) {
            var oRoleMap = {
                "SuperAdmin": {
                    roleLabel: "Super Admin",
                    accessLevel: "Full Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://shield",
                    summary: "Unrestricted access to manage all Branches, Staffs, Vendors, Finances, and System-wide configurations.",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#008b96",
                            label: "Infrastructure",
                            detail: "Manage Branches, Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#008b96",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#008b96",
                            label: "User Management",
                            detail: "Administer Staff members, Vendors and Customer Support requests"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#008b96",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#008b96",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Admin": {
                    roleLabel: "Branch Admin",
                    accessLevel: "Branch-Wide Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://building",
                    summary: "Unrestricted access to manage all Branches, Staff, Finances, and System-wide configurations",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#008b96",
                            label: "Infrastructure",
                            detail: "Manage Branches, Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#008b96",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#008b96",
                            label: "User Management",
                            detail: "Administer Staff members and Customer Support requests"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#008b96",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#008b96",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Branch Manager": {
                    roleLabel: "Branch Manager",
                    accessLevel: "Branch-Scoped Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://manager",
                    summary: "Unrestricted access to all operations specific to your allocated Branch — Staff, Finances, and System-wide configurations",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#008b96",
                            label: "Infrastructure",
                            detail: "Manage Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#008b96",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#008b96",
                            label: "User Management",
                            detail: "Administer Staff members and Customer Support requests"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#008b96",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#008b96",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Front Office Employee": {
                    roleLabel: "Front Office Employee",
                    accessLevel: "Mixed Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://retail-store",


                    summary: "As a Front Office Employee, you have full access to customer-facing operations (bookings, invoices, complaints) and view-only access to branch-level data.",
                    accessItems: [
                        { icon: "sap-icon://customer", color: "#008b96", label: "Full: Customers & Invoices", detail: "Manage customers, invoices, payments and deposits." },
                        { icon: "sap-icon://display", color: "#e9730c", label: "View Only: Config Data", detail: "Branch, Bed, Room, Facilities, Amenities and coupons are read-only." },

                    ]
                },
                "Housekeeping": {
                    roleLabel: "House Keeping",
                    accessLevel: "Limited Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://customer-view",
                    summary: "As a Housekeeping staff member, your access is restricted to Complaint & Complaint Dashbaord",
                    accessItems: [
                        { icon: "sap-icon://customer-view", color: "#008b96", label: "View: Complaint Details", detail: "Read-only access to complaint details" },
                        { icon: "sap-icon://alert", color: "#008b96", label: "View: Complaint Dashboard", detail: "Read-only access to complaint dashboard." },
                    ]
                },
                "ManageVendor": {
                    roleLabel: "Vendor Manager",
                    accessLevel: "Vendor-Only Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://supplier",
                    summary: "As a Vendor Manager, you have access to vendor management and customer support requests. All hostel operations, customer data, and dashboards are outside your scope.",
                    accessItems: [
                        { icon: "sap-icon://supplier", color: "#008b96", label: "Vendor Management", detail: "Full access to create and manage  vendors" },
                        { icon: "sap-icon://customer", color: "#008b96", label: "Customer Support", detail: "Review and manage customer support requests." },
               
                    ]
                }
            };

            return oRoleMap[sRole] || {
                roleLabel: sRole || "User",
                accessLevel: "Custom Access",
                accessState: "None",
                accessIcon: "sap-icon://person-placeholder",
                summary: "Your access is configured by your system administrator. Use the tour below to explore available modules.",
                accessItems: [
                    { icon: "sap-icon://information", color: "#008b96", label: "Contact Admin", detail: "Reach out to your Super Admin for access queries." }
                ]
            };
        },

        // ─── STEP 1: Show the role overview popover ────────────────────────────────
        onStartGuide: function () {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oVisibilityModel = oComponent.getModel("TileVisibility");
            var oLoginModel = oComponent.getModel("LoginModel");

            if (!oVisibilityModel || !oVisibilityModel.getData()) {
                sap.m.MessageToast.show("Please wait, checking permissions...");
                return;
            }

            var sRole = oLoginModel ? oLoginModel.getProperty("/Role") : "";
            var oConfig = this._getRoleGuideConfig(sRole);
            this._setStepsGuideButtonVisible(false);
            this._bStartingTileGuide = false;

            if (!this._oRoleGuideModel) {
                this._oRoleGuideModel = new sap.ui.model.json.JSONModel();
                oComponent.setModel(this._oRoleGuideModel, "roleGuideModel");
            }
            this._oRoleGuideModel.setData(oConfig);

            // Pre-build tile steps so they're ready when tour starts
            this._buildTileSteps();

            var that = this;
            if (!this._oRoleGuideDialog) {
                this.loadFragment({
                    name: "sap.ui.com.project1.fragment.RoleGuidePopover"  // keep same file name
                }).then(function (oDialog) {
                    that._oRoleGuideDialog = oDialog;
                    oDialog.setModel(that._oRoleGuideModel, "roleGuideModel");
                    oDialog.attachAfterClose(that._handleRoleGuideAfterClose, that);
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oRoleGuideDialog.setModel(this._oRoleGuideModel, "roleGuideModel");
                this._oRoleGuideDialog.open();
            }
        },

        // ─── STEP 1 helpers ────────────────────────────────────────────────────────
        onBeforeRolePopoverClose: function (oEvent) {
            // Allow it to close freely (unlike the tour popover, this one can be dismissed)
        },

        onSkipRoleGuide: function () {
            if (this._oRoleGuideDialog && this._oRoleGuideDialog.isOpen()) {
                this._oRoleGuideDialog.close();
            } else {
                this._setStepsGuideButtonVisible(true);
            }
        },

        // ─── STEP 2: "Start Tour" pressed — close role popover, begin tile tour ───
        onStartTileGuide: function () {
            var that = this;
            this._bStartingTileGuide = true;
            if (this._oRoleGuideDialog && this._oRoleGuideDialog.isOpen()) {
                this._oRoleGuideDialog.attachEventOnce("afterClose", function () {
                    that._launchTileSteps();
                });
                this._oRoleGuideDialog.close();
            } else {
                this._launchTileSteps();
            }
        },

        _buildTileSteps: function () {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oI18nModel = oComponent.getModel("i18n");
            var oLoginModel = oComponent.getModel("LoginModel");
            var oBundle = oI18nModel ? oI18nModel.getResourceBundle() : null;
            var sRole = oLoginModel ? oLoginModel.getProperty("/Role") : "";

            // ── Master tile config ─────────────────────────────────────────────────
            // descKey      = default full-access i18n key
            // descKey_view = read-only variant key (used when role has view-only access)
            // viewOnlyRoles = roles that get the _view variant for this tile
            var aTileConfig = [
                // ── Category 1: Setup & Configuration ────────────────────────────
                {
                    id: "branchTile",
                    headerKey: "manageBranchDetails",
                    descKey: "tour_desc_branch",
                    descKey_view: "tour_desc_branch_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "bedTile",
                    headerKey: "manageBedDetails",
                    descKey: "tour_desc_bed",
                    descKey_view: "tour_desc_bed_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "roomTile",
                    headerKey: "tileManageRoomDetails",
                    descKey: "tour_desc_room",
                    descKey_view: "tour_desc_room_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "customerTile",
                    headerKey: "manageExtraFacilities",
                    descKey: "tour_desc_facilities",
                    descKey_view: "tour_desc_facilities_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id1roomTile",
                    headerKey: "maintainHostelFeatures",
                    descKey: "tour_desc_hostelFeatures",
                    descKey_view: "tour_desc_hostelFeatures_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id2roomTile",
                    headerKey: "manageCouponDetails",
                    descKey: "tour_desc_coupon",
                    descKey_view: "tour_desc_coupon_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id5roomTile",
                    headerKey: "manageStaff",
                    descKey: "tour_desc_staff"
                    // No viewOnlyRoles — staff tile is fully hidden for Front OfficeEmployee (not shown)
                },
                {
                    id: "id6roomTile",
                    headerKey: "manageVendors",
                    descKey: "tour_desc_vendor"
                    // ManageVendor role sees only this tile — full access
                },

                {
                    id: "idSupportTile",
                    headerKey: "supportVendor",
                    descKey: "tour_desc_support"
                },
                // ── Category 2: Operations ────────────────────────────────────────
                {
                    id: "id3roomTile",
                    headerKey: "manageCustomerDetails",
                    descKey: "tour_desc_customer"
                    // Full access for all roles that can see it
                },
                {
                    id: "id4roomTile",
                    headerKey: "invoiceDetails",
                    descKey: "tour_desc_invoice"
                },
                {
                    id: "id8roomTile",
                    headerKey: "returnDeposit",
                    descKey: "tour_desc_deposit"
                },
                {
                    id: "id7roomTile",
                    headerKey: "payment",
                    descKey: "tour_desc_payment"
                },
                {
                    id: "TP_DamageTile",
                    headerKey: "damageTracking",
                    descKey: "tour_desc_damage"
                },
                {
                    id: "id12roomTile",
                    headerKey: "Complaintdetails",
                    descKey: "tour_desc_complaint",
                    descKey_view: "tour_desc_complaint_view",
                    viewOnlyRoles: ["Housekeeping"]
                },
                {
                    id: "id11roomTile",
                    headerKey: "customerReview",
                    descKey: "tour_desc_customerReview",
                    descKey_view: "tour_desc_customerReview_view",
                    viewOnlyRoles: ["Housekeeping"]
                },



                // ── Dashboards ────────────────────────────────────────────────────
                {
                    id: "id9roomTile",
                    headerKey: "bookingDashboard",
                    descKey: "tour_desc_bookingDashboard"
                },
                {
                    id: "id10roomTile",
                    headerKey: "paymentdashboard",
                    descKey: "tour_desc_paymentDashboard"
                },
                {
                    id: "TP_ComplaintDashBoardTile",
                    headerKey: "complainDashboard",
                    descKey: "tour_desc_complainDashboard",
                    descKey_view: "tour_desc_complainDashboard_view",
                    viewOnlyRoles: ["Housekeeping"]
                },
                {
                    id: "TP_DamageDashboard",
                    headerKey: "damageDashboard",
                    descKey: "tour_desc_damageDashboard"
                }
            ];

            // ── Role-aware description resolver ───────────────────────────────────
            var fnResolveDesc = function (config) {
                var bIsViewOnly = config.viewOnlyRoles &&
                    config.viewOnlyRoles.indexOf(sRole) !== -1;


                var sKey = (bIsViewOnly && config.descKey_view)
                    ? config.descKey_view
                    : config.descKey;

                return oBundle ? oBundle.getText(sKey) : sKey;
            };

            var aAllSteps = aTileConfig.map(function (config) {
                return {
                    ui5Id: config.id,
                    title: oBundle ? oBundle.getText(config.headerKey) : config.headerKey,
                    description: fnResolveDesc(config),
                    media: ""
                };
            });

            // Only include tiles that are visible AND rendered in DOM
            this._aPendingTileSteps = aAllSteps.filter(function (step) {
                var oControl = oView.byId(step.ui5Id);
                return oControl &&
                    oControl.getVisible &&
                    oControl.getVisible() &&
                    !!oControl.getDomRef();
            });
        },
        _launchTileSteps: function () {
            if (!this._aPendingTileSteps || !this._aPendingTileSteps.length) {
                this._setStepsGuideButtonVisible(true);
                sap.m.MessageToast.show("No tiles available for the guide.");
                return;
            }
            this.initUniversalTour(this._aPendingTileSteps);
        },

        _cleanupTour: function () {
            BaseController.prototype._cleanupTour.apply(this, arguments);
            this._setStepsGuideButtonVisible(true);
        },

        // Raise Bug

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
                sap.m.MessageToast.show("You can upload a maximum of 3 files only");
                oEvent.getSource().clear();
                return;
            }

            for (let i = 0; i < oFiles.length; i++) {
                const oFile = oFiles[i];

                const bDuplicate = aAttachments.some(file => file.originalFilename === oFile.name);
                if (bDuplicate) {
                    sap.m.MessageToast.show("File already uploaded");
                    oEvent.getSource().clear();
                    return;
                }

                if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
                    sap.m.MessageToast.show("Only JPG, JPEG, PNG allowed");
                    oEvent.getSource().clear();
                    return;
                }
            }

            const sAppName = oView.getModel("RaiseBugModel").getProperty("/AppName") || "";
            const sBaseName = sAppName || "bug";
            const iExistingCount = aAttachments.filter(f =>
                new RegExp(`^${sBaseName} \\d+$`).test(f.filename)
            ).length;

            this.getBusyDialog();
            this._addSupportBusyProcessingRow();

            try {
                for (let i = 0; i < oFiles.length; i++) {
                    const oFile = oFiles[i];

                    let processedFile = oFile;
                    const fileSizeMB = oFile.size / (1024 * 1024);
                    const isImage = oFile.type === "image/jpeg" || oFile.type === "image/jpg" || oFile.type === "image/png";

                    if (fileSizeMB > 2 && isImage) {
                        if (typeof imageCompression === "undefined") {
                            throw new Error("Compression library missing");
                        }
                        const options = {
                            maxSizeMB: 1.9,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true,
                            initialQuality: 0.95
                        };
                        processedFile = await imageCompression(oFile, options);
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
                sap.m.MessageToast.show(err.message || "Failed to process image.");
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

           onAppnamechanges:function(oEvent){
 utils._LCstrictValidationComboBox(oEvent)
        },
        onBugdescriptionchnages:function(oEvent){
              utils._LCvalidateMandatoryField(oEvent)
        },
      
      

        onBugSubmit: async function(){
            const oView = this.getView();
            const oBugModel = oView.getModel("RaiseBugModel").getData();
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
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("RB_id_appname")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("RB_id_bugDescription")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("RB_id_RaisedBy")), "ID") &&
                utils._LCvalidateEmail(sap.ui.getCore().byId(oView.createId("RB_id_Email")), "ID")
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // IMAGE VALIDATION
            // if (!aAttachments || aAttachments.length === 0) {
            //     MessageToast.show("Please upload at least one image.");
            //     return;
            // }

            if (aAttachments.length > 3) {
                MessageToast.show("You can upload maximum 3 images only.");
                return;
            }

            const todayDate = new Date().toISOString().split("T")[0];

            const data = {
                AppName: oBugModel.AppName,
                BugDescription: oBugModel.BugDescription,
                RaisedBy: oBugModel.RaisedBy,
                Email: oBugModel.Email,
                CreatedDate: todayDate,
                Status: "Open",
                ...photoPayload
            };
            const payload = {
                data: data
            };
            this.getBusyDialog();
            await this.ajaxCreateWithJQuery("HM_Bug", payload);
            this.closeBusyDialog()
            MessageToast.show("Bug submitted successfully");

          this.RB_onCancelButtonPress()
        },


        // ─── Admin Booking ("Book for Yourself") ──────────────────────────────────

        TileV_onpressBookForYourself: function () {
            if (!this.getView().getModel("AdminBookingModel")) {
                this.getView().setModel(new JSONModel(this._getAdminBookingInitialData()), "AdminBookingModel");
            }

            if (!this._AdminBookingDialog) {
                sap.ui.core.Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.ui.com.project1.fragment.AdminBooking",
                    controller: this
                }).then(function (oDialog) {
                    this._AdminBookingDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._FragmentDatePickersReadOnly([this.getView().createId("AB_id_NC_DOB")]);
                    this._resetAdminBookingModel();
                    this._loadAdminBookingBranches();
                    this._loadAdminBookingExistingCustomers();
                    oDialog.open();
                }.bind(this));
            } else {
                this._resetAdminBookingModel();
                this._FragmentDatePickersReadOnly([this.getView().createId("AB_id_NC_DOB")]);
                this._loadAdminBookingBranches();
                this._loadAdminBookingExistingCustomers();
                this._AdminBookingDialog.open();
            }
        },

        _getAdminBookingInitialData: function () {
            var oDOBRange = this._getAdminBookingDOBRange();
            return {
                Branches: [],
                Rooms: [],
                AllRooms: [],
                Plans: [],
                BranchCode: "",
                RoomKey: "",
                SelectedPlan: "",
                RentDisplay: "",
                DOBFocusedDate: oDOBRange.focusedDate,
                DOBMinDate: oDOBRange.minDate,
                DOBMaxDate: oDOBRange.maxDate,
                // None selected initially. New (0) | Existing (1) | Self (2)
                CustomerType: "",
                CustomerTypeIndex: -1,
                // New Customer form data + cascade lists
                NC: this._getEmptyNewCustomer(),
                NCStates: [],
                NCCities: [],
                // Existing Customer suggestions + selected record
                EC: this._getEmptyExistingCustomer(),
                ECSuggestions: [],
                ECAllCustomers: this._aAdminBookingExistingCustomersCache || []
            };
        },

        _getAdminBookingDOBRange: function () {
            var oMaxDate = new Date();
            oMaxDate.setHours(0, 0, 0, 0);

            var oMinDate = new Date(oMaxDate);
            oMinDate.setFullYear(oMaxDate.getFullYear() - 100);

            var oFocusedDate = new Date(2000, 0, 1);
            if (oFocusedDate < oMinDate) {
                oFocusedDate = new Date(oMinDate);
            } else if (oFocusedDate > oMaxDate) {
                oFocusedDate = new Date(oMaxDate);
            }

            return {
                focusedDate: oFocusedDate,
                minDate: oMinDate,
                maxDate: oMaxDate
            };
        },

        _getEmptyNewCustomer: function () {
            return {
                Salutation: "",
                UserName: "",
                DateOfBirth: "",
                Gender: "",
                EmailID: "",
                Country: "",
                State: "",
                City: "",
                STDCode: "",
                MobileNo: "",
                Address: ""
            };
        },

        _getEmptyExistingCustomer: function () {
            return {
                UserID: "",
                Salutation: "",
                UserName: "",
                EmailID: "",
                STDCode: "",
                MobileNo: "",
                DateOfBirth: "",
                Gender: "",
                Country: "",
                State: "",
                City: "",
                Address: ""
            };
        },

        _resetAdminBookingModel: function () {
            var oModel = this.getView().getModel("AdminBookingModel");
            if (!oModel) return;
            // Re-resolve assigned branches on each open (handles re-login).
            this._sAdminBookingAssignedBranches = undefined;
            var oDOBRange = this._getAdminBookingDOBRange();
            oModel.setData({
                Branches: oModel.getProperty("/Branches") || [],
                Rooms: [],
                AllRooms: [],
                Plans: [],
                BranchCode: "",
                RoomKey: "",
                SelectedPlan: "",
                RentDisplay: "",
                DOBFocusedDate: oDOBRange.focusedDate,
                DOBMinDate: oDOBRange.minDate,
                DOBMaxDate: oDOBRange.maxDate,
                CustomerType: "",
                CustomerTypeIndex: -1,
                NC: this._getEmptyNewCustomer(),
                NCStates: [],
                NCCities: [],
                EC: this._getEmptyExistingCustomer(),
                ECSuggestions: [],
                ECAllCustomers: this._aAdminBookingExistingCustomersCache || []
            });
        },

        // Resolve the logged-in user's own assigned branch codes from their
        // HM_CustomerContact record (by UserID), the same authoritative source
        // the BranchData "Property Name" filter uses. Returns "" for SuperAdmin
        // (meaning "all branches"). Cached for the dialog's lifetime.
        _getAdminBookingAssignedBranches: async function () {
            var oLoginModel = this.getOwnerComponent().getModel("LoginModel").getData();
            if (oLoginModel.Role === "SuperAdmin") {
                return "";
            }
            if (this._sAdminBookingAssignedBranches !== undefined) {
                return this._sAdminBookingAssignedBranches;
            }
            var sAssigned = oLoginModel.BranchCode || "";
            try {
                var oSelf = await this.ajaxReadWithJQuery("HM_CustomerContact", {
                    UserID: oLoginModel.EmployeeID
                });
                var aSelf = Array.isArray(oSelf.data) ? oSelf.data : [oSelf.data].filter(Boolean);
                if (aSelf.length && aSelf[0].BranchCode) {
                    sAssigned = aSelf[0].BranchCode;
                }
            } catch (e) {
                // Fall back to LoginModel.BranchCode on read failure.
            }
            this._sAdminBookingAssignedBranches = sAssigned;
            return sAssigned;
        },

        // Load only the branches assigned to the current user. Mirrors the
        // BranchData "Property Name" filter: the logged-in user's assigned
        // branch codes come from their own HM_CustomerContact record (by
        // UserID), not from mainModel — which isn't populated in this page's
        // context, so relying on it showed every branch to every admin.
        _loadAdminBookingBranches: async function () {
            var oModel = this.getView().getModel("AdminBookingModel");
            var oLoginModel = this.getOwnerComponent().getModel("LoginModel").getData();

            try {
                this.getBusyDialog();

                var sAssignedBranches = await this._getAdminBookingAssignedBranches();

                var filters = {};
                if (oLoginModel.Role === "SuperAdmin") {
                    filters.BranchID = "";
                } else if (oLoginModel.Role === "Admin") {
                    filters.BranchID = sAssignedBranches;
                    filters.Role = "Admin";
                } else {
                    filters.BranchID = sAssignedBranches;
                }

                var oData = await this.ajaxReadWithJQuery("HM_Branch", filters);
                var aBranchData = Array.isArray(oData.data) ? oData.data : [oData.data].filter(Boolean);

                // De-duplicate by BranchID
                var oUnique = {};
                aBranchData.forEach(function (b) {
                    if (b && b.BranchID && !oUnique[b.BranchID]) {
                        oUnique[b.BranchID] = {
                            BranchID: b.BranchID,
                            Name: b.Name,
                            City: b.City,
                            PropertyType: b.PropertyType || "",
                            GSTIN: b.GSTIN || "",
                            GSTType: b.Type || "",
                            GSTValue: b.Value || "",
                            Country: b.Country || "",
                            State: b.State || "",
                            CheckInTime: b.CheckinTime || "",
                            CheckOutTime: b.CheckoutTime || ""
                        };
                    }
                });
                var aBranches = Object.values(oUnique).sort((a, b) => a.BranchID.localeCompare(b.BranchID));
                oModel.setProperty("/Branches", aBranches);

                if (!aBranches.length) {
                    MessageToast.show(this.i18nModel.getText("adminBookingNoBranches"));
                }
            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },

        // Branch changed → load rooms belonging to that branch
        onAdminBookingBranchChange: async function (oEvent) {
            var oModel = this.getView().getModel("AdminBookingModel");
            var oBranchCtrl = this.byId("AB_id_Branch");
            var sBranchCode = oEvent.getParameter("selectedItem") ?
                oEvent.getParameter("selectedItem").getKey() : "";

            // Reset dependent fields
            oModel.setProperty("/BranchCode", sBranchCode);
            oModel.setProperty("/Rooms", []);
            oModel.setProperty("/AllRooms", []);
            oModel.setProperty("/RoomKey", "");
            oModel.setProperty("/Plans", []);
            oModel.setProperty("/SelectedPlan", "");
            oModel.setProperty("/RentDisplay", "");
            if (oBranchCtrl) oBranchCtrl.setValueState(sBranchCode ? "None" : "Error");
            ["AB_id_Room", "AB_id_Plan", "AB_id_CustomerType"].forEach(function (sId) {
                var oCtrl = this.byId(sId);
                if (oCtrl && oCtrl.setValueState) oCtrl.setValueState("None");
            }.bind(this));

            if (!sBranchCode) return;

            try {
                this.getBusyDialog();
                var oData = await this.ajaxReadWithJQuery("HM_Rooms", {});
                var aRooms = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData].filter(Boolean);

                var normalize = v => (v ? String(v).trim().toLowerCase() : "");
                var aBranchRooms = aRooms.filter(r => normalize(r.BranchCode) === normalize(sBranchCode));

                // De-duplicate rooms by BedTypeName (booking is done at bed-type level)
                var oUnique = {};
                aBranchRooms.forEach(function (r) {
                    var sKey = r.BedTypeName || r.RoomNo;
                    if (sKey && !oUnique[sKey]) {
                        // HM_Rooms stores the combined "BedType - ACType" in BedTypeName
                        // (there is no separate ACType field). Split it so the booking
                        // payload can rebuild the exact "BedType - ACType" the backend expects.
                        var sBedTypeName = r.BedTypeName || "";
                        var iSep = sBedTypeName.lastIndexOf(" - ");
                        var sBedType = iSep > -1 ? sBedTypeName.slice(0, iSep).trim() : sBedTypeName.trim();
                        var sACType = iSep > -1 ? sBedTypeName.slice(iSep + 3).trim() : "";
                        oUnique[sKey] = {
                            RoomKey: sKey,
                            RoomText: r.BedTypeName || r.RoomNo,
                            BedTypeName: sBedTypeName,
                            BedType: sBedType,
                            ACType: sACType,
                            BranchCode: r.BranchCode || sBranchCode,
                            Price: r.Price || "",
                            MonthPrice: r.MonthPrice || "",
                            YearPrice: r.YearPrice || "",
                            Currency: r.Currency || "",
                            Deposit: r.Deposit || "",
                            DepositCurrency: r.DepositCurrency || "",
                            NoOfPerson: r.NoofPerson || r.NoOfPerson || ""
                        };
                    }
                });
                oModel.setProperty("/AllRooms", Object.values(oUnique));
                oModel.setProperty("/Rooms", Object.values(oUnique));

            // If the admin is in "Existing Customer" mode, changing branch must
            // clear only the selected customer. Existing customer lookup is global.
            if (oModel.getProperty("/CustomerType") === "Existing") {
                oModel.setProperty("/EC", this._getEmptyExistingCustomer());
                oModel.setProperty("/ECSuggestions", []);
                this._clearAdminBookingCustomerEmailToken();
            }
            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },

        // Room changed → build the available plan options from the room's prices
        onAdminBookingRoomChange: function (oEvent) {
            var oModel = this.getView().getModel("AdminBookingModel");
            var oRoomCtrl = this.byId("AB_id_Room");
            var sRoomKey = oEvent.getParameter("selectedItem") ?
                oEvent.getParameter("selectedItem").getKey() : "";

            oModel.setProperty("/RoomKey", sRoomKey);
            oModel.setProperty("/SelectedPlan", "");
            oModel.setProperty("/RentDisplay", "");
            if (oRoomCtrl) oRoomCtrl.setValueState(sRoomKey ? "None" : "Error");
            ["AB_id_Plan", "AB_id_CustomerType"].forEach(function (sId) {
                var oCtrl = this.byId(sId);
                if (oCtrl && oCtrl.setValueState) oCtrl.setValueState("None");
            }.bind(this));

            var oRoom = (oModel.getProperty("/AllRooms") || []).find(r => r.RoomKey === sRoomKey);
            if (!oRoom) {
                oModel.setProperty("/Plans", []);
                return;
            }

            var aPlans = [];
            if (Number(oRoom.Price) > 0) { aPlans.push({ key: "Per Day", text: "Per Day" }); }
            if (Number(oRoom.MonthPrice) > 0) { aPlans.push({ key: "Per Month", text: "Per Month" }); }
            if (Number(oRoom.YearPrice) > 0) { aPlans.push({ key: "Per Year", text: "Per Year" }); }
            oModel.setProperty("/Plans", aPlans);
        },

        // Plan changed → show the rent for that plan
        onAdminBookingPlanChange: function (oEvent) {
            var oModel = this.getView().getModel("AdminBookingModel");
            var oPlanCtrl = this.byId("AB_id_Plan");
            var sPlan = oEvent.getParameter("selectedItem") ?
                oEvent.getParameter("selectedItem").getKey() : "";

            oModel.setProperty("/SelectedPlan", sPlan);
            if (oPlanCtrl) oPlanCtrl.setValueState(sPlan ? "None" : "Error");
            var oCustomerType = this.byId("AB_id_CustomerType");
            if (oCustomerType && oCustomerType.setValueState) oCustomerType.setValueState("None");

            var oRoom = (oModel.getProperty("/AllRooms") || []).find(r => r.RoomKey === oModel.getProperty("/RoomKey"));
            if (!oRoom || !sPlan) {
                oModel.setProperty("/RentDisplay", "");
                return;
            }

            var sRent = "";
            if (sPlan === "Per Day") { sRent = oRoom.Price; }
            else if (sPlan === "Per Month") { sRent = oRoom.MonthPrice; }
            else if (sPlan === "Per Year") { sRent = oRoom.YearPrice; }

            var sCurrency = (oRoom.Currency || "").trim();
            oModel.setProperty("/RentDisplay", sRent ? (sCurrency + " " + sRent + " / " + sPlan).trim() : "");
        },

        // ─── Customer type (Self / New / Existing) ─────────────────────────────

        onAdminBookingCustomerTypeChange: function (oEvent) {
            var oModel = this.getView().getModel("AdminBookingModel");
            var iIndex = oEvent.getParameter("selectedIndex");
            var sType = iIndex === 0 ? "New" : (iIndex === 1 ? "Existing" : "Self");
            oModel.setProperty("/CustomerTypeIndex", iIndex);
            oModel.setProperty("/CustomerType", sType);
            if (oEvent.getSource && oEvent.getSource().setValueState) {
                oEvent.getSource().setValueState("None");
            }

            // Reset the customer sub-forms when switching modes so stale data
            // from a previous selection never leaks into the booking.
            oModel.setProperty("/NC", this._getEmptyNewCustomer());
            oModel.setProperty("/NCStates", []);
            oModel.setProperty("/NCCities", []);
            oModel.setProperty("/EC", this._getEmptyExistingCustomer());
            oModel.setProperty("/ECSuggestions", []);
            oModel.setProperty("/ECAllCustomers", this._aAdminBookingExistingCustomersCache || []);
            this._clearAdminBookingCustomerEmailToken();
            this._clearAdminBookingCustomerValueStates();

            // Existing Customer lookup is loaded once globally and filtered locally.
            if (sType === "Existing") {
                this._loadAdminBookingExistingCustomers();
            }
        },

        // Remove the email token (if any) from the Existing Customer MultiInput
        // and re-enable typing.
        _clearAdminBookingCustomerEmailToken: function () {
            var oMultiInput = this.byId("AB_id_EC_Email");
            if (!oMultiInput) return;
            if (oMultiInput.removeAllTokens) {
                oMultiInput.removeAllTokens();
            }
            if (oMultiInput.setValueHelpOnly) {
                oMultiInput.setValueHelpOnly(false);
            }
            oMultiInput.setValue("");
        },

        _hasAdminBookingExistingCustomerToken: function () {
            var oMultiInput = this.byId("AB_id_EC_Email");
            return !!(oMultiInput && oMultiInput.getTokens && oMultiInput.getTokens().length);
        },

        _clearAdminBookingCustomerValueStates: function () {
            ["AB_id_Branch", "AB_id_Room", "AB_id_Plan", "AB_id_CustomerType",
                "AB_id_NC_Salutation", "AB_id_NC_Name", "AB_id_NC_DOB", "AB_id_NC_Gender",
                "AB_id_NC_Email", "AB_id_NC_Country", "AB_id_NC_State", "AB_id_NC_City",
                "AB_id_NC_STD", "AB_id_NC_Mobile", "AB_id_NC_Address", "AB_id_EC_Email"
            ].forEach(function (sId) {
                var oCtrl = this.byId(sId);
                if (oCtrl && oCtrl.setValueState) {
                    oCtrl.setValueState("None");
                }
            }.bind(this));
        },

        _validateAdminBookingBaseFields: function () {
            var bValid = true;
            var aFields = [
                { id: "AB_id_Branch", modelPath: "/BranchCode" },
                { id: "AB_id_Room", modelPath: "/RoomKey" },
                { id: "AB_id_Plan", modelPath: "/SelectedPlan" },
                { id: "AB_id_CustomerType", modelPath: "/CustomerType" }
            ];
            var oModel = this.getView().getModel("AdminBookingModel");

            aFields.forEach(function (oField) {
                var oControl = this.byId(oField.id);
                var bFieldValid = !!oModel.getProperty(oField.modelPath);
                if (oControl && oControl.setValueState) {
                    oControl.setValueState(bFieldValid ? "None" : "Error");
                }
                bValid = bValid && bFieldValid;
            }.bind(this));

            return bValid;
        },

        // ─── Option A: New Customer (mirrors Hostel onSignUp rules) ────────────

        onAdminBookingNCNameLive: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },

        onAdminBookingNCSalutationChange: function (oEvent) {
            var oSalutation = oEvent.getSource();
            var sKey = oSalutation.getSelectedKey();
            var oGender = this.byId("AB_id_NC_Gender");
            var oModel = this.getView().getModel("AdminBookingModel");

            oModel.setProperty("/NC/Gender", "");
            if (oGender) {
                oGender.setSelectedKey("");
                oGender.setEnabled(true);
            }

            if (sKey === "Mr.") {
                oModel.setProperty("/NC/Gender", "Male");
                if (oGender) {
                    oGender.setSelectedKey("Male");
                    oGender.setEnabled(false);
                }
            } else if (sKey === "Ms." || sKey === "Mrs.") {
                oModel.setProperty("/NC/Gender", "Female");
                if (oGender) {
                    oGender.setSelectedKey("Female");
                    oGender.setEnabled(false);
                }
            }

            utils._LCstrictValidationSelect(oSalutation);
        },

        onAdminBookingNCEmailLive: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        // Email is the FIRST field in the New Customer form. When the admin
        // leaves it (change event), check globally whether this email already
        // exists in HM_Login. If it does, offer to reuse that record instead of
        // making the admin fill the whole form only to fail on a duplicate at
        // Book Now. Identity is global (keyed by email); the booking associates
        // them with the selected branch.
        onAdminBookingNCEmailExistsCheck: async function (oEvent) {
            // Only proceed once the email is well-formed.
            if (!utils._LCvalidateEmail(oEvent)) return;

            var sEmail = (oEvent.getSource().getValue() || "").trim();
            if (!sEmail) return;

            try {
                this.getBusyDialog();
                var oRead = await this.ajaxReadWithJQuery("HM_Login", { EmailID: sEmail });
                var oExisting = (Array.isArray(oRead.data) ? oRead.data[0] : oRead.data) || null;
                this.closeBusyDialog();

                if (!oExisting || !oExisting.UserID) return; // genuinely new → keep filling the form

                // Booking needs branch/room/plan before we can route. Seed first;
                // if incomplete, _seedAdminBookingHostelModel already toasts.
                if (!this._seedAdminBookingHostelModel()) return;

                this._confirmAdminBookingReuseExisting(oExisting);
            } catch (err) {
                this.closeBusyDialog();
                // A failed pre-check shouldn't block creating a new customer;
                // the Book Now path still guards against duplicates.
            }
        },

        onAdminBookingNCAddressChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        // DOB change → validate 0–100 age and store yyyy-MM-dd, returns boolean
        // (used both as a change handler and as a validation gate in Book Now).
        onAdminBookingNCDOBChange: function (oEventOrControl) {
            var oDatePicker = (oEventOrControl && typeof oEventOrControl.getSource === "function")
                ? oEventOrControl.getSource() : oEventOrControl;
            var oModel = this.getView().getModel("AdminBookingModel");
            if (!oDatePicker) return false;

            var raw = oDatePicker.getDateValue();
            var oRange = this._getAdminBookingDOBRange();
            if (!raw) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Date of birth is required");
                oModel.setProperty("/NC/DateOfBirth", "");
                return false;
            }
            raw.setHours(0, 0, 0, 0);
            if (raw < oRange.minDate || raw > oRange.maxDate) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Age must be between 0 and 100");
                oModel.setProperty("/NC/DateOfBirth", "");
                return false;
            }
            oDatePicker.setValueState("None");
            var yyyy = raw.getFullYear();
            var mm = String(raw.getMonth() + 1).padStart(2, "0");
            var dd = String(raw.getDate()).padStart(2, "0");
            oModel.setProperty("/NC/DateOfBirth", yyyy + "-" + mm + "-" + dd);
            return true;
        },

        // Country → filter states + auto STD (uses component State/City models)
        onAdminBookingNCCountryChange: function (oEvent) {
            var oCountry = oEvent ? oEvent.getSource() : this.byId("AB_id_NC_Country");
            if (!oCountry) return;

            var oModel = this.getView().getModel("AdminBookingModel");
            var oCountryModel = this.getOwnerComponent().getModel("CountryModel");
            var oStateModel = this.getOwnerComponent().getModel("StateModel");

            if (!oCountryModel) return;

            if (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                oModel.setProperty("/NC/State", "");
                oModel.setProperty("/NC/City", "");
                oModel.setProperty("/NCStates", []);
                oModel.setProperty("/NCCities", []);
            }

            var aCountries = oCountryModel.getData() || [];
            var oMatch = this._findBestMatch(oModel.getProperty("/NC/Country"), aCountries, "countryName");
            if (oMatch) {
                oCountry.setSelectedKey(oMatch.countryName);
                var sCountryCode = oMatch.code;
                var allStates = oStateModel ? (oStateModel.getData() || []) : [];
                oModel.setProperty("/NCStates", allStates.filter(function (s) {
                    return s.countryCode === sCountryCode;
                }));
                var oMobile = this.byId("AB_id_NC_Mobile");
                if (oMobile) oMobile.setMaxLength(sCountryCode === "IN" ? 10 : 18);
                this._autoSelectNCSTD(sCountryCode);
            }
        },

        // State → filter cities
        onAdminBookingNCStateChange: function (oEvent) {
            var oState = oEvent ? oEvent.getSource() : this.byId("AB_id_NC_State");
            var oModel = this.getView().getModel("AdminBookingModel");
            var oCityModel = this.getOwnerComponent().getModel("CityModel");

            if (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                oModel.setProperty("/NC/City", "");
                oModel.setProperty("/NCCities", []);
            }

            var aFilteredStates = oModel.getProperty("/NCStates") || [];
            var oMatch = this._findBestMatch(oModel.getProperty("/NC/State"), aFilteredStates, "stateName");
            if (oMatch) {
                oState.setSelectedKey(oMatch.stateName);
                var sStateName = oMatch.stateName;
                var oCountry = this.byId("AB_id_NC_Country");
                var sCountryCode = (oCountry.getSelectedItem() && oCountry.getSelectedItem().getAdditionalText()
                    ? oCountry.getSelectedItem().getAdditionalText().trim() : "IN");
                var allCities = oCityModel ? (oCityModel.getData() || []) : [];
                oModel.setProperty("/NCCities", allCities.filter(function (c) {
                    return c.countryCode === sCountryCode && c.stateName === sStateName;
                }));
            }
        },

        // City → fuzzy match selection
        onAdminBookingNCCityChange: function (oEvent) {
            var oCityCtrl = oEvent ? oEvent.getSource() : this.byId("AB_id_NC_City");
            var oModel = this.getView().getModel("AdminBookingModel");

            if (oEvent) utils._LCvalidateMandatoryField(oEvent);

            var aFilteredCities = oModel.getProperty("/NCCities") || [];
            var sSearch = oModel.getProperty("/NC/City");
            var oMatch = this._findBestMatch(sSearch, aFilteredCities, "cityName");
            if (oMatch) {
                oCityCtrl.setSelectedKey(oMatch.cityName);
                oModel.setProperty("/NC/City", oMatch.cityName);
                oCityCtrl.setValueState("None");
            } else {
                oModel.setProperty("/NC/City", sSearch);
            }
        },

        _autoSelectNCSTD: function (sCode) {
            var oSTD = this.byId("AB_id_NC_STD");
            var oModel = this.getView().getModel("AdminBookingModel");
            if (!oSTD) return;
            var oItem = oSTD.getItems().find(function (i) {
                return i.getAdditionalText() === sCode;
            });
            if (oItem) {
                oSTD.setSelectedKey(oItem.getKey());
                oModel.setProperty("/NC/STDCode", oItem.getKey());
            }
        },

        // Fuzzy match a typed value against a list (mirrors Hostel _findBestMatch).
        _findBestMatch: function (sInput, aItems, sPropertyName) {
            if (!sInput || !aItems || aItems.length === 0) return null;
            var sNormInput = sInput.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
            var oMatch = aItems.find(function (item) {
                return item[sPropertyName].toLowerCase().trim() === sInput.toLowerCase().trim();
            });
            if (!oMatch) {
                oMatch = aItems.find(function (item) {
                    var sNormItem = item[sPropertyName].toLowerCase().trim().replace(/[^a-z0-9]/g, "");
                    return sNormItem.includes(sNormInput) || sNormInput.includes(sNormItem);
                });
            }
            return oMatch;
        },

        onAdminBookingNCSTDChange: function (oEvent) {
            var oSTD = oEvent.getSource();
            var sValue = (oSTD.getValue() || "").trim();
            var oMobile = this.byId("AB_id_NC_Mobile");
            var oModel = this.getView().getModel("AdminBookingModel");
            if (!sValue) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("STD Code is required");
                oModel.setProperty("/NC/STDCode", "");
                return;
            }
            var STD_REGEX = /^\+[1-9][0-9]*$/;
            if (!STD_REGEX.test(sValue)) {
                oSTD.setValueState("Error");
                oSTD.setValueStateText("Must start with + and have no leading zero (e.g., +91)");
                oModel.setProperty("/NC/STDCode", "");
            } else {
                oSTD.setValueState("None");
                if (oMobile) oMobile.setMaxLength(sValue === "+91" ? 10 : 18);
                oModel.setProperty("/NC/STDCode", sValue);
            }
        },

        onAdminBookingNCMobileLive: function (oEvent) {
            var isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;
            var oInput = oEvent.getSource();
            var val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            var oSTD = this.byId("AB_id_NC_STD");
            var stdRaw = (oSTD && oSTD.getValue()) || "";
            var std = stdRaw.startsWith("+") ? stdRaw : "+" + stdRaw;

            if (!val) return oInput.setValueState("None");
            if (!std || std === "+") {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("selectISDCodeFirst"));
                return;
            }
            var valid = utils._LCvalidateISDmobile(oInput, std);
            oInput.setValueState(valid ? "None" : "Error");
            if (!valid) {
                oInput.setValueStateText(std === "+91"
                    ? this.i18nModel.getText("MSmobileNoValueStateIN")
                    : this.i18nModel.getText("MSmobileNoValueStateINT"));
            }
        },

        // Validate in the same order the New Customer fields are shown in the dialog.
        _validateAdminBookingNewCustomer: function () {
            var oModel = this.getView().getModel("AdminBookingModel");
            var sSTD = this.byId("AB_id_NC_STD").getValue() || oModel.getProperty("/NC/STDCode");
            return (
                utils._LCvalidateEmail(this.byId("AB_id_NC_Email"), "ID") &&
                utils._LCstrictValidationSelect(this.byId("AB_id_NC_Salutation")) &&
                utils._LCvalidateName(this.byId("AB_id_NC_Name"), "ID") &&
                this.onAdminBookingNCDOBChange(this.byId("AB_id_NC_DOB")) &&
                utils._LCstrictValidationSelect(this.byId("AB_id_NC_Gender")) &&
                utils._LCvalidateMandatoryField(this.byId("AB_id_NC_Country"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("AB_id_NC_State"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("AB_id_NC_City"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("AB_id_NC_STD"), "ID") &&
                utils._LCvalidateISDmobile(this.byId("AB_id_NC_Mobile"), sSTD) &&
                utils._LCvalidateAddress(this.byId("AB_id_NC_Address"))
            );
        },

        // ─── Option B: Existing Customer (autocomplete via MultiInput) ─────────

        // Load HM_LoginUser globally without branch/role/email filters. This runs once
        // per dialog open and the cached list is filtered locally while typing.
        _loadAdminBookingExistingCustomers: async function () {
            var oModel = this.getView().getModel("AdminBookingModel");

            if (Array.isArray(this._aAdminBookingExistingCustomersCache)) {
                oModel.setProperty("/ECAllCustomers", this._aAdminBookingExistingCustomersCache);
                this._prefillAdminBookingECSuggestions();
                return;
            }

            try {
                this.getBusyDialog();
                //here i have to work: Mateen
                var oData = await this.ajaxReadWithJQuery("HM_LoginUser", {});
                var aRows = Array.isArray(oData.data) ? oData.data : [oData.data].filter(Boolean);

                var oSeen = {};
                var aCustomers = [];
                aRows.forEach(function (oRow) {
                    var sEmail = oRow && oRow.EmailID;
                    if (sEmail && !oSeen[sEmail]) {
                        oSeen[sEmail] = true;
                        aCustomers.push(oRow);
                    }
                });

                this._aAdminBookingExistingCustomersCache = aCustomers;
                oModel.setProperty("/ECAllCustomers", aCustomers);
                this._prefillAdminBookingECSuggestions();
            } catch (err) {
                oModel.setProperty("/ECAllCustomers", []);
                oModel.setProperty("/ECSuggestions", []);
                MessageToast.show(this.i18nModel.getText("adminBookingCustomerReadFailed"));
            } finally {
                this.closeBusyDialog();
            }
        },

        // Build the Existing Customer email suggestion list. An empty term
        // auto-loads the first 20 email IDs (no filter) so the value help is
        // populated the moment it opens — without typing. A typed term filters
        // the cached list with a partial "contains" match. The result is always
        // capped at 20 so the dropdown never exceeds a single screen.
        _buildAdminBookingECSuggestions: function (sTerm) {
            var aCustomers = this.getView().getModel("AdminBookingModel").getProperty("/ECAllCustomers") || [];
            var aResult;

            if (!sTerm) {
                aResult = aCustomers;
            } else {
                var sNormalizedTerm = String(sTerm).toLowerCase();
                aResult = aCustomers.filter(function (oRow) {
                    return String(oRow.EmailID || "").toLowerCase().indexOf(sNormalizedTerm) !== -1;
                });
            }

            return aResult.slice(0, 20).map(function (oRow) {
                return { EmailID: oRow.EmailID, UserID: oRow.UserID || "" };
            });
        },

        // Pre-fill the suggestion dropdown with the first 20 email IDs (no
        // filter) as soon as the Existing Customer list is ready, so the value
        // help is already populated before the user types or focuses the field.
        _prefillAdminBookingECSuggestions: function () {
            if (this._hasAdminBookingExistingCustomerToken()) {
                return;
            }
            var oMultiInput = this.byId("AB_id_EC_Email");
            if (oMultiInput && oMultiInput.getValue && oMultiInput.getValue()) {
                return;
            }
            this.getView().getModel("AdminBookingModel").setProperty(
                "/ECSuggestions",
                this._buildAdminBookingECSuggestions("")
            );
        },

        // Focus/typing → build the suggestion list (auto-load 20 on open, filter while typing).
        onAdminBookingECEmailSuggest: function (oEvent) {
            var sTerm = (oEvent.getParameter("suggestValue") || "").trim();
            var oModel = this.getView().getModel("AdminBookingModel");

            // After selection the email is held as a token and the input value is
            // empty. Focus/change events must not clear the selected customer.
            if (this._hasAdminBookingExistingCustomerToken()) {
                return;
            }

            oModel.setProperty("/EC/EmailID", sTerm);
            oModel.setProperty("/EC", Object.assign(this._getEmptyExistingCustomer(), { EmailID: sTerm }));

            var sNormalizedTerm = sTerm.toLowerCase();
            var aItems = this._buildAdminBookingECSuggestions(sTerm);
            oModel.setProperty("/ECSuggestions", aItems);

            // Tell the user when their typed term matches no customer — but only
            // once per distinct term, so the toast doesn't repeat on every
            // keystroke while they keep typing the same unmatched value. An empty
            // term auto-loads the first 20 emails, so it is never a "no match".
            if (sTerm && !aItems.length) {
                if (this._sLastNoMatchTerm !== sNormalizedTerm) {
                    this._sLastNoMatchTerm = sNormalizedTerm;
                    MessageToast.show(this.i18nModel.getText("adminBookingECNoResults"));
                }
            } else {
                this._sLastNoMatchTerm = "";
            }
        },

        onAdminBookingECEmailChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sEmail = String(oSource.getValue() || "").trim();
            var oModel = this.getView().getModel("AdminBookingModel");

            // Selecting a suggestion creates a token and clears the input value.
            // The subsequent change/focus-out event should keep the selected data.
            if (this._hasAdminBookingExistingCustomerToken()) {
                oSource.setValueState("None");
                return;
            }

            // Token-removal echo guard. Removing a token makes UI5 fire a trailing
            // `change` event that can still carry the removed email — and the order
            // is NOT guaranteed: `change` may fire BEFORE `tokenUpdate`. A flag set
            // in `tokenUpdate` would therefore be too late. The ordering-independent
            // signal is the last-selected email: if this `change` carries the same
            // email we just had selected and there is no token anymore, it is the
            // removal echo — never re-select / re-add it. (Re-selecting the same
            // email intentionally is still possible via the suggestion list, which
            // goes through `onAdminBookingECEmailSelected`, not blocked here.)
            var sLastSelected = this._sAdminBookingECLastSelectedEmail || "";
            if (sEmail && sLastSelected &&
                sEmail.toLowerCase() === sLastSelected.toLowerCase()) {
                oModel.setProperty("/EC", this._getEmptyExistingCustomer());
                oSource.setValue("");
                oSource.setValueState("None");
                return;
            }

            // Secondary guard for the `tokenUpdate`-before-`change`(s) ordering.
            // A one-shot flag is not enough here: UI5 can fire MORE THAN ONE
            // trailing `change` after a token removal (e.g. value change + focus
            // out), and a flag consumed by the first one would leave the second
            // unguarded → the exact-match path re-adds the token. A timestamp
            // window survives every trailing event within it, so all echoes are
            // ignored. Cleared only by time, never by an event, so it can't be
            // exhausted.
            if (this._tAdminBookingECRemovedAt &&
                (Date.now() - this._tAdminBookingECRemovedAt) < 700) {
                oModel.setProperty("/EC", this._getEmptyExistingCustomer());
                if (sEmail) {
                    oSource.setValue("");
                }
                oSource.setValueState("None");
                return;
            }

            oModel.setProperty("/EC", Object.assign(this._getEmptyExistingCustomer(), { EmailID: sEmail }));

            if (!sEmail) {
                oModel.setProperty("/ECSuggestions", []);
                return;
            }

            var oExact = (oModel.getProperty("/ECAllCustomers") || []).find(function (oRow) {
                return String(oRow.EmailID || "").toLowerCase() === sEmail.toLowerCase();
            });

            if (oExact) {
                this._selectAdminBookingExistingCustomer(oExact);
                return;
            }

            oSource.setValueState("Error");
            MessageToast.show(this.i18nModel.getText("adminBookingECNoResults"));
        },

        // Selection → wrap the email in a single token, lock typing, and populate
        // the read-only details + booking identity from the cached HM_LoginUser row.
        onAdminBookingECEmailSelected: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem") || oEvent.getParameter("selectedRow");
            if (!oItem) return;
            var sEmail = oItem.getText ? oItem.getText() : "";
            if (!sEmail) return;

            var oUser = (this.getView().getModel("AdminBookingModel").getProperty("/ECAllCustomers") || []).find(function (oRow) {
                return oRow.EmailID === sEmail;
            });
            if (!oUser) {
                MessageToast.show(this.i18nModel.getText("adminBookingECNoResults"));
                return;
            }

            this._selectAdminBookingExistingCustomer(oUser);
        },

        _selectAdminBookingExistingCustomer: function (oUser) {
            var oModel = this.getView().getModel("AdminBookingModel");
            var oMultiInput = this.byId("AB_id_EC_Email");
            var sEmail = oUser.EmailID || "";

            // Build exactly one token for the chosen email.
            oMultiInput.removeAllTokens();
            oMultiInput.addToken(new Token({ key: sEmail, text: sEmail }));
            oMultiInput.setValue("");
            // Lock typing but keep the token's "X" interactive.
            oMultiInput.setValueHelpOnly(true);
            oMultiInput.setValueState("None");

            // Remember the selected email so a trailing `change` fired on token
            // removal (which can carry this same email) is recognized as an echo
            // and ignored instead of re-adding the token. Cleared on removal.
            this._sAdminBookingECLastSelectedEmail = sEmail;

            oModel.setProperty("/EC", {
                UserID: oUser.UserID || "",
                Salutation: oUser.Salutation || "",
                UserName: oUser.UserName || "",
                EmailID: oUser.EmailID || sEmail,
                STDCode: oUser.STDCode || "",
                MobileNo: oUser.MobileNo || "",
                DateOfBirth: this._formatAdminBookingDOB(oUser.DateOfBirth),
                Gender: oUser.Gender || "",
                Country: oUser.Country || "",
                State: oUser.State || "",
                City: oUser.City || "",
                Address: oUser.Address || ""
            });
        },

        _formatAdminBookingDOB: function (vDate) {
            if (!vDate) return "";
            if (typeof vDate === "string" && vDate.indexOf("/") > -1) return vDate;

            var oDate = new Date(vDate);
            if (isNaN(oDate.getTime())) return String(vDate || "");

            return [
                String(oDate.getDate()).padStart(2, "0"),
                String(oDate.getMonth() + 1).padStart(2, "0"),
                oDate.getFullYear()
            ].join("/");
        },

        // Removing the token (its "X") clears the selection and all the
        // loaded read-only details, and re-enables typing.
        onAdminBookingECTokenUpdate: function (oEvent) {
            if (oEvent.getParameter("type") !== "removed") return;
            var oModel = this.getView().getModel("AdminBookingModel");
            var oMultiInput = this.byId("AB_id_EC_Email");

            // Record the removal time. onAdminBookingECEmailChange uses a window
            // (not a one-shot flag) so EVERY trailing `change` fired after a
            // removal is ignored — UI5 can fire several. Survives multiple echoes
            // and is ordering-independent when combined with the email-match
            // guard above (which covers the change-before-tokenUpdate ordering).
            this._tAdminBookingECRemovedAt = Date.now();

            oModel.setProperty("/EC", this._getEmptyExistingCustomer());
            this._sAdminBookingECLastSelectedEmail = "";
            if (oMultiInput) {
                if (oMultiInput.removeAllTokens) {
                    oMultiInput.removeAllTokens();
                }
                oMultiInput.setValueHelpOnly(false);
                oMultiInput.setValue("");
                oMultiInput.setValueState("None");
            }
        },

        // Seed the room/branch part of HostelModel that is common to every mode.
        // Returns the seeded core HostelModel, or null if branch/room/plan invalid.
        _seedAdminBookingHostelModel: function () {
            var oModel = this.getView().getModel("AdminBookingModel");
            var sBranchCode = oModel.getProperty("/BranchCode");
            var sRoomKey = oModel.getProperty("/RoomKey");
            var sPlan = oModel.getProperty("/SelectedPlan");

            if (!this._validateAdminBookingBaseFields()) {
                MessageToast.show(this.i18nModel.getText("adminBookingSelectBranchRoomPlan"));
                return null;
            }

            var oRoom = (oModel.getProperty("/AllRooms") || []).find(function (r) {
                return r.RoomKey === sRoomKey;
            });
            if (!oRoom) {
                MessageToast.show(this.i18nModel.getText("adminBookingSelectBranchRoomPlan"));
                return null;
            }

            var oBranch = (oModel.getProperty("/Branches") || []).find(function (b) {
                return b.BranchID === sBranchCode;
            }) || {};

            var sRent = "";
            if (sPlan === "Per Day") { sRent = oRoom.Price; }
            else if (sPlan === "Per Month") { sRent = oRoom.MonthPrice; }
            else if (sPlan === "Per Year") { sRent = oRoom.YearPrice; }

            var oHostelModel = sap.ui.getCore().getModel("HostelModel");
            if (!oHostelModel) {
                oHostelModel = new JSONModel({});
                sap.ui.getCore().setModel(oHostelModel, "HostelModel");
            }
            // Seed a fresh booking context (avoid stale data from a prior booking)
            oHostelModel.setData({
                BranchCode: sBranchCode,
                Area: oBranch.Name || "",
                BranchName: oBranch.Name || "",
                RoomType: oRoom.BedTypeName,
                BedType: oRoom.BedType,
                ACType: oRoom.ACType,
                Price: oRoom.Price || 0,
                MonthPrice: oRoom.MonthPrice || 0,
                YearPrice: oRoom.YearPrice || 0,
                Currency: oRoom.Currency,
                Deposit: oRoom.Deposit || "",
                DepositCurrency: oRoom.DepositCurrency || "",
                Capacity: oRoom.NoOfPerson || "",
                PropertyType: oBranch.PropertyType || "",
                GSTIN: oBranch.GSTIN || "",
                PropertyGSTIN: oBranch.GSTIN || "",
                GSTType: oBranch.GSTType || "",
                GSTValue: oBranch.GSTValue || "",
                Country: oBranch.Country || "",
                State: oBranch.State || "",
                CheckInTime: oBranch.CheckInTime || "",
                CheckOutTime: oBranch.CheckOutTime || "",
                SelectedPriceType: sPlan,
                SelectedPriceValue: sRent,
                FinalPrice: sRent,
                AppliedCoupons: [],
                // Tells the booking flow to come back here once finished/cancelled
                ReturnRoute: "TilePage"
            });

            return oHostelModel;
        },

        // Overlay a customer's identity onto HostelModel so the booking is made
        // on their behalf (not the logged-in admin). BookingOnBehalf tells the
        // Booking page not to overwrite these with the admin's LoginModel.
        _applyAdminBookingCustomerIdentity: function (oHostelModel, oCustomer) {
            oHostelModel.setProperty("/BookingOnBehalf", true);
            oHostelModel.setProperty("/UserID", oCustomer.UserID || "");
            oHostelModel.setProperty("/Salutation", oCustomer.Salutation || "Mr.");
            oHostelModel.setProperty("/FullName", oCustomer.UserName || "");
            oHostelModel.setProperty("/CustomerEmail", oCustomer.EmailID || "");
            oHostelModel.setProperty("/STDCode", oCustomer.STDCode || "+91");
            oHostelModel.setProperty("/MobileNo", oCustomer.MobileNo || "");
            oHostelModel.setProperty("/Gender", oCustomer.Gender || "");
            oHostelModel.setProperty("/DateOfBirth", oCustomer.DateOfBirth || "");
            oHostelModel.setProperty("/Country", oCustomer.Country || "");
            oHostelModel.setProperty("/State", oCustomer.State || "");
            oHostelModel.setProperty("/City", oCustomer.City || "");
            oHostelModel.setProperty("/Address", oCustomer.Address || "");
        },

        // Book Now → dispatch on the selected customer type.
        onAdminBookingBookNow: function () {
            var sType = this.getView().getModel("AdminBookingModel").getProperty("/CustomerType");
            if (!this._validateAdminBookingBaseFields()) {
                MessageToast.show(sType ? this.i18nModel.getText("adminBookingSelectBranchRoomPlan") : this.i18nModel.getText("adminBookingSelectCustomerType"));
                return;
            }
            if (!sType) {
                MessageToast.show(this.i18nModel.getText("adminBookingSelectCustomerType"));
                return;
            }
            if (sType === "New") {
                this._adminBookingBookNowNewCustomer();
            } else if (sType === "Existing") {
                this._adminBookingBookNowExistingCustomer();
            } else {
                this._adminBookingBookNowSelf();
            }
        },

        // Option C: Self Booking — unchanged baseline behavior.
        _adminBookingBookNowSelf: function () {
            var oHostelModel = this._seedAdminBookingHostelModel();
            if (!oHostelModel) return;
            oHostelModel.setProperty("/BookingOnBehalf", false);
            this.onAdminBookingCancel();
            this.getOwnerComponent().getRouter().navTo("RouteBooking");
        },

        // Option A: New Customer — register in HM_Login, read it back, then
        // route into booking on behalf of the newly created customer.
        //
        // Identity in HM_Login is GLOBAL and keyed by email, while the
        // Existing-Customer list is scoped to the selected branch. So a person
        // can be "new to this branch" yet already exist in the system (e.g. they
        // booked at another branch). A blind insert would fail on the duplicate
        // email. Instead we look the email up globally first and, if it already
        // exists, offer to reuse that record (the booking itself associates them
        // with this branch).
        _adminBookingBookNowNewCustomer: async function () {
            if (!this._seedAdminBookingHostelModel()) return;
            if (!this._validateAdminBookingNewCustomer()) {
                MessageToast.show(this.i18nModel.getText("adminBookingNCFillAllFields"));
                return;
            }

            var oModel = this.getView().getModel("AdminBookingModel");
            var oNC = oModel.getProperty("/NC");
            var sEmail = (oNC.EmailID || "").trim();

            var oExisting = null;
            try {
                this.getBusyDialog();
                // Global lookup by email only (NO branch filter). HM_Login returns
                // an auth-style error when the email is not found, so that error
                // means "new customer" here and must not block registration.
                var oRead = await this.ajaxReadWithJQuery("HM_Login", { EmailID: sEmail });
                oExisting = (Array.isArray(oRead.data) ? oRead.data[0] : oRead.data) || null;
            } catch (err) {
                oExisting = null;
            } finally {
                this.closeBusyDialog();
            }

            if (oExisting && oExisting.UserID) {
                // Already in the system → ask the admin to reuse it instead
                // of erroring on a duplicate email.
                this._confirmAdminBookingReuseExisting(oExisting);
                return;
            }

            // Genuinely new → create the record, then book.
            await this._adminBookingCreateAndBookNewCustomer(oNC, sEmail);
        },

        // The email already exists globally. Confirm with the admin, and on OK
        // reuse that record for this branch's booking (no new HM_Login row). On
        // Cancel, clear the email field so a different one can be entered.
        _confirmAdminBookingReuseExisting: function (oExisting) {
            var sName = oExisting.UserName || oExisting.EmailID;
            var sMobile = ((oExisting.STDCode || "") + " " + (oExisting.MobileNo || "")).trim();
            var sMsg = this.i18nModel.getText("adminBookingEmailExistsReuse", [sName, sMobile]);
            MessageBox.confirm(sMsg, {
                title: this.i18nModel.getText("adminBookingEmailExistsTitle"),
                styleClass: "myUnifiedBtn",
                contentWidth: "500px",                
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oHostelModel = sap.ui.getCore().getModel("HostelModel");
                        this._applyAdminBookingCustomerIdentity(oHostelModel, oExisting);
                        this.onAdminBookingCancel();
                        this.getOwnerComponent().getRouter().navTo("RouteBooking");
                    } else {
                        // Declined reuse → clear the email so they can enter another.
                        var oModel = this.getView().getModel("AdminBookingModel");
                        oModel.setProperty("/NC/EmailID", "");
                        var oEmail = this.byId("AB_id_NC_Email");
                        if (oEmail) {
                            oEmail.setValue("");
                            oEmail.setValueState("None");
                            oEmail.focus();
                        }
                    }
                }.bind(this)
            });
        },

        // Create a brand-new HM_Login customer, read it back for the
        // authoritative record (UserID, etc.), then route into booking.
        _adminBookingCreateAndBookNewCustomer: async function (oNC, sEmail) {
            var TimeDate = new Date().toISOString().replace("T", " ").slice(0, 19);

            // Same registration payload shape as onSignUp (password omitted —
            // admin is booking on the customer's behalf).
            var payload = {
                data: {
                    Salutation: oNC.Salutation,
                    UserName: (oNC.UserName || "").trim(),
                    Role: "Customer",
                    Type: "Customer",
                    EmailID: sEmail,
                    STDCode: oNC.STDCode,
                    MobileNo: oNC.MobileNo,
                    Status: "Active",
                    TimeDate: TimeDate,
                    DateOfBirth: oNC.DateOfBirth || "",
                    Gender: oNC.Gender,
                    Country: oNC.Country,
                    State: oNC.State,
                    City: oNC.City,
                    Address: (oNC.Address || "").trim()
                }
            };

            try {
                this.getBusyDialog();
                var oResp = await this.ajaxCreateWithJQuery("HM_Login", payload);
                if (oResp && oResp.success === false) {
                    MessageBox.error(oResp.message || this.i18nModel.getText("adminBookingRegisterFailed"), {
                        title: "Registration Failed",
                        styleClass: "myUnifiedBtn"
                    });
                    return;
                }

                // Read back the newly created customer so the booking carries
                // their authoritative HM_Login record (UserID, etc.).
                var oRead = await this.ajaxReadWithJQuery("HM_Login", {
                    EmailID: sEmail,
                    Role: "Customer"
                });
                var oUser = (Array.isArray(oRead.data) ? oRead.data[0] : oRead.data) || null;
                if (!oUser || !oUser.UserID) {
                    MessageBox.error(this.i18nModel.getText("adminBookingCustomerReadFailed"), {
                        title: "Registration Failed",
                        styleClass: "myUnifiedBtn"
                    });
                    return;
                }

                var oHostelModel = sap.ui.getCore().getModel("HostelModel");
                this._applyAdminBookingCustomerIdentity(oHostelModel, oUser);

                this.closeBusyDialog();
                this.onAdminBookingCancel();
                this.getOwnerComponent().getRouter().navTo("RouteBooking");
            } catch (err) {
                var sMsg = (err && err.responseJSON && err.responseJSON.message) ||
                    this.i18nModel.getText("adminBookingRegisterFailed");
                MessageBox.error(sMsg, { title: "Registration Failed", styleClass: "myUnifiedBtn" });
            } finally {
                this.closeBusyDialog();
            }
        },

        // Option B: Existing Customer — carry the selected HM_Login record
        // into booking on their behalf.
        _adminBookingBookNowExistingCustomer: function () {
            var oModel = this.getView().getModel("AdminBookingModel");
            var oEC = oModel.getProperty("/EC");
            if (!oEC || !oEC.UserID || !oEC.EmailID) {
                this.byId("AB_id_EC_Email").setValueState("Error");
                MessageToast.show(this.i18nModel.getText("adminBookingSelectCustomerEmail"));
                return;
            }
            var oHostelModel = this._seedAdminBookingHostelModel();
            if (!oHostelModel) return;
            this._applyAdminBookingCustomerIdentity(oHostelModel, oEC);
            this.onAdminBookingCancel();
            this.getOwnerComponent().getRouter().navTo("RouteBooking");
        },

        onAdminBookingCancel: function () {
            if (this._AdminBookingDialog) {
                this._AdminBookingDialog.close();
            }
        },

        onPressbugs:function(){

              var oLoginData = this.getOwnerComponent().getModel("LoginModel").getData();
    var oRaiseBugModel = this.getView().getModel("RaiseBugModel");

    // Set logged-in user details
    oRaiseBugModel.setProperty("/RaisedBy", oLoginData.UserName || "");
    oRaiseBugModel.setProperty("/Email", oLoginData.EmailID || "");
             if (!this._RaiseBugDialog) {

                sap.ui.core.Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.ui.com.project1.fragment.RaiseBug",
                    controller: this
                }).then(function (oDialog) {

                    this._RaiseBugDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();

                    this._RaiseBugDialog.attachAfterClose(() => {
                 
                    this.RB_onCancelButtonPress();
                });

                }.bind(this));

            } else {
                this._RaiseBugDialog.open();
            }
        },
        RB_onCancelButtonPress:function(){
             const oView = this.getView();

    // 1️⃣ Clear model data
    const oBugModel = oView.getModel("RaiseBugModel");
    if (oBugModel) {
        oBugModel.setData({
            AppName: "",
            BugDescription: "",
            RaisedBy: "",
            Email: ""
        });
    }

    //  Clear uploaded images
    const oUploaderData = oView.getModel("UploaderData");
    if (oUploaderData) {
        oUploaderData.setProperty("/attachments", []);
    }

    // 3️⃣ Clear tokens
    const oTokenModel = oView.getModel("tokenModel");
    if (oTokenModel) {
        oTokenModel.setProperty("/tokens", []);
    }

    // 4️⃣ Reset ValueState
    const aFields = [
        "RB_id_appname",
        "RB_id_bugDescription",
        "RB_id_RaisedBy",
        "RB_id_Email"
    ];

    aFields.forEach(id => {
        const oControl = sap.ui.getCore().byId(oView.createId(id));
        if (oControl) {
            oControl.setValueState("None");
        }
    });

    // 5️⃣ Clear file uploader
    const oUploader = sap.ui.getCore().byId(oView.createId("RB_id_FileUploader1"));
    if (oUploader) {
        oUploader.clear();
    }

    // 6️⃣ Close dialog
    this._RaiseBugDialog.close();
        }

    })
})
